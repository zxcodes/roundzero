import { createServerFn } from "@tanstack/react-start";
import { clearSession, updateSession, useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  assertAccountCanAuthenticate,
  canRestoreSoftDeletedAccount,
} from "@/features/accounts/grace";
import { getCandidateProfileByUserId } from "@/features/candidates/queries/queries_sql";
import {
  createCompanyMember,
  getActiveMembershipByUserId,
  getCompanyByMemberUserId,
  getInvitationByToken,
  getMembershipByCompanyAndUser,
  markInvitationAccepted,
  reactivateCompanyMember,
} from "@/features/companies/queries/membership-queries_sql";
import { getCompanyById } from "@/features/companies/queries/queries_sql";
import {
  enforceCompanyEntitlement,
  lockCompanyEntitlementScope,
} from "@/features/entitlements/server/enforcement";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";
import { userRoleSchema } from "@/shared/enums";
import { emailsMatch, fetchGoogleUserInfo } from "@/shared/google-userinfo";
import { authMiddleware } from "@/shared/middleware";
import { isPlatformAdmin } from "@/shared/platform-admin";
import { isUniqueViolation } from "@/shared/postgres-errors";
import { type SessionData, sessionConfig } from "@/shared/session";
import { requiredTrimmedString } from "@/shared/validation";
import {
  getUserByGoogleId,
  getUserById,
  restoreUser,
  setUserRole as setUserRoleQuery,
  softDeleteUser,
  updateUserName as updateUserNameQuery,
  upsertUserByGoogleId,
} from "../queries/queries_sql";

const googleAuthSchema = z.object({
  access_token: z.string().min(1),
  role: userRoleSchema.optional(),
});

const acceptInviteSchema = z.object({
  token: z.string().trim().min(1),
  access_token: z.string().min(1).optional(),
});

export const loginWithGoogle = createServerFn({ method: "POST" })
  .validator(zodValidator(googleAuthSchema))
  .handler(async ({ data }) => {
    const googleUser = await fetchGoogleUserInfo(data.access_token);
    if (!googleUser.verified_email) {
      throw new Error("Google account email must be verified");
    }

    const db = getDb();
    const existing = await getUserByGoogleId(db, { googleId: googleUser.id });
    if (existing) {
      assertAccountCanAuthenticate(existing);
    }

    const user = await upsertUserByGoogleId(db, {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      googleId: googleUser.id,
    });

    if (!user) {
      const tombstone = await getUserByGoogleId(db, { googleId: googleUser.id });
      if (tombstone) {
        assertAccountCanAuthenticate(tombstone);
      }
      throw new Error("Failed to create or update user");
    }

    assertAccountCanAuthenticate(user);

    // Restore soft-deleted user signing back in within the grace window
    let restored = false;
    if (canRestoreSoftDeletedAccount(user)) {
      await restoreUser(db, { id: user.id });
      restored = true;
    }

    // Auto-assign role if provided and user doesn't have one yet
    let activeUser = user;
    if (data.role && !user.role) {
      const updated = await setUserRoleQuery(db, {
        role: data.role,
        id: user.id,
      });

      if (updated) {
        activeUser = { ...user, ...updated };
      }
    }

    await updateSession<SessionData>(sessionConfig, { userId: activeUser.id });

    let onboardingComplete = false;
    if (activeUser.role === "company") {
      const company = await getCompanyByMemberUserId(db, { userId: activeUser.id });
      onboardingComplete = Boolean(company?.onboardingCompletedAt);
    } else if (activeUser.role === "candidate") {
      const profile = await getCandidateProfileByUserId(db, { userId: activeUser.id });
      onboardingComplete = Boolean(profile?.onboardingCompletedAt);
    }

    return { user: activeUser, onboardingComplete, restored };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .validator(zodValidator(acceptInviteSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    const invitation = await getInvitationByToken(db, { token: data.token });

    if (!invitation || invitation.acceptedAt || invitation.revokedAt) {
      throw new Error("Invitation not found or no longer valid");
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      throw new Error("This invitation has expired");
    }

    const session = await useSession<SessionData>(sessionConfig);
    let activeUser: NonNullable<Awaited<ReturnType<typeof getUserById>>>;

    if (data.access_token) {
      const googleUser = await fetchGoogleUserInfo(data.access_token);
      if (!googleUser.verified_email) {
        throw new Error("Google account email must be verified");
      }
      if (!emailsMatch(googleUser.email, invitation.email)) {
        throw new Error(`Sign in with the Google account for ${invitation.email}`);
      }

      const existing = await getUserByGoogleId(db, { googleId: googleUser.id });
      if (existing) {
        assertAccountCanAuthenticate(existing);
      }

      const user = await upsertUserByGoogleId(db, {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        googleId: googleUser.id,
      });

      if (!user) {
        const tombstone = await getUserByGoogleId(db, { googleId: googleUser.id });
        if (tombstone) {
          assertAccountCanAuthenticate(tombstone);
        }
        throw new Error("Failed to create or update user");
      }

      assertAccountCanAuthenticate(user);

      if (canRestoreSoftDeletedAccount(user)) {
        await restoreUser(db, { id: user.id });
      }

      const refreshedUser = await getUserById(db, { id: user.id });
      if (!refreshedUser) {
        throw new Error("Failed to create or update user");
      }
      activeUser = refreshedUser;
    } else if (session.data.userId) {
      const sessionUser = await getUserById(db, { id: session.data.userId });
      if (!sessionUser) {
        throw new Error("Not authenticated");
      }
      if (!emailsMatch(sessionUser.email, invitation.email)) {
        throw new Error(`Sign in with ${invitation.email} to accept this invitation`);
      }
      activeUser = sessionUser;
    } else {
      throw new Error("Sign in with Google to accept this invitation");
    }

    if (activeUser.role === "candidate") {
      throw new Error("This email is registered as a candidate account");
    }

    if (!activeUser.role) {
      const updated = await setUserRoleQuery(db, {
        role: "company",
        id: activeUser.id,
      });
      if (updated) {
        activeUser = updated;
      }
    }

    try {
      await db.begin(async (tx) => {
        const transaction = asSqlTransaction(tx);

        const freshInvitation = await getInvitationByToken(transaction, { token: data.token });
        if (!freshInvitation || freshInvitation.acceptedAt || freshInvitation.revokedAt) {
          throw new Error("Invitation not found or no longer valid");
        }
        if (freshInvitation.expiresAt.getTime() <= Date.now()) {
          throw new Error("This invitation has expired");
        }

        const existingMembership = await getActiveMembershipByUserId(transaction, {
          userId: activeUser.id,
        });
        if (existingMembership) {
          throw new Error("You already belong to a company");
        }

        const company = await getCompanyById(transaction, { id: freshInvitation.companyId });
        if (!company) {
          throw new Error("Company not found");
        }

        await lockCompanyEntitlementScope(transaction, company.id);
        await enforceCompanyEntitlement(transaction, company.id, "team.accept");

        const priorMembership = await getMembershipByCompanyAndUser(transaction, {
          companyId: freshInvitation.companyId,
          userId: activeUser.id,
        });

        if (priorMembership?.status === "removed") {
          const reactivated = await reactivateCompanyMember(transaction, {
            role: freshInvitation.role,
            invitedBy: freshInvitation.invitedBy,
            companyId: freshInvitation.companyId,
            userId: activeUser.id,
          });
          if (!reactivated) {
            throw new Error("Failed to rejoin company");
          }
        } else if (priorMembership) {
          throw new Error("You already belong to a company");
        } else {
          await createCompanyMember(transaction, {
            companyId: freshInvitation.companyId,
            userId: activeUser.id,
            role: freshInvitation.role,
            invitedBy: freshInvitation.invitedBy,
          });
        }

        const accepted = await markInvitationAccepted(transaction, { id: freshInvitation.id });
        if (!accepted) {
          throw new Error("Invitation not found or no longer valid");
        }
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new Error("You already belong to a company");
      }
      throw error;
    }

    await updateSession<SessionData>(sessionConfig, { userId: activeUser.id });

    const company = await getCompanyByMemberUserId(db, { userId: activeUser.id });
    const onboardingComplete = Boolean(company?.onboardingCompletedAt);

    return { user: activeUser, onboardingComplete };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession(sessionConfig);
  return {};
});

/** React Query key for the cached current user (see `__root.beforeLoad`). */
export const currentUserQueryKey = ["currentUser"] as const;

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);

  if (!session.data.userId) {
    return null;
  }

  const db = getDb();
  const user = await getUserById(db, { id: session.data.userId });
  if (!user) {
    return null;
  }

  return {
    ...user,
    isPlatformAdmin: isPlatformAdmin(user.email),
  };
});

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    await softDeleteUser(db, { id: context.userId });
    await clearSession(sessionConfig);
    return {};
  });

const updateNameSchema = z.object({
  name: requiredTrimmedString(100, "Name is required"),
});

export const updateUserName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(updateNameSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const user = await updateUserNameQuery(db, {
      name: data.name,
      id: context.userId,
    });

    if (!user) {
      throw new Error("Failed to update name");
    }

    return { user };
  });
