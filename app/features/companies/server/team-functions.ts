import { createServerFn } from "@tanstack/react-start";
import { clearSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getUserByEmail } from "@/features/auth/queries/queries_sql";
import { sendCompanyInviteEmail } from "@/features/companies/services/invite-email";
import {
  enforceCompanyEntitlement,
  lockCompanyEntitlementScope,
  readCompanyEntitlements,
} from "@/features/entitlements/server/enforcement";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";
import { companyInvitationRoleSchema } from "@/shared/enums";
import { emailsMatch, normalizeEmail } from "@/shared/google-userinfo";
import { assertCanManageTeam, assertCompanyOwner } from "@/shared/membership-auth";
import { companyMiddleware } from "@/shared/middleware";
import { sessionConfig } from "@/shared/session";
import { zodValidatorWithFormattedErrors } from "@/shared/validation";
import {
  createInvitation,
  getActiveMemberByCompanyEmail,
  getActiveMembershipByUserId,
  getInvitationByToken,
  getMembershipById,
  getPendingInvitationByEmail,
  listActiveMembersByCompany,
  listPendingInvitationsByCompany,
  removeCompanyMember,
  resetInvitationForResend,
  revokeExpiredInvitationsByEmail,
  revokeInvitation as revokeInvitationQuery,
  updateCompanyMemberRole,
  updateCompanyOwner,
} from "../queries/membership-queries_sql";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const inviteExpiryAt = () => new Date(Date.now() + INVITE_EXPIRY_MS);

const newInviteToken = () => crypto.randomUUID();

const invitationIdSchema = z.object({
  invitationId: z.string().uuid(),
});

const memberIdSchema = z.object({
  memberId: z.string().uuid(),
});

const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .transform(normalizeEmail),
  role: companyInvitationRoleSchema,
});

const inviteTokenSchema = z.object({
  token: z.string().trim().min(1),
});

export const getInvitationPreview = createServerFn({ method: "GET" })
  .validator(zodValidator(inviteTokenSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    const invitation = await getInvitationByToken(db, { token: data.token });

    if (!invitation) {
      return null;
    }

    if (invitation.acceptedAt || invitation.revokedAt) {
      return null;
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    const entitlements = await readCompanyEntitlements(db, invitation.companyId);
    const canAccept = !entitlements.team.members.atLimit;

    return {
      companyName: invitation.companyName,
      email: invitation.email,
      role: invitation.role,
      canAccept,
      capacityMessage: canAccept
        ? null
        : "This team has reached its member limit. Ask the owner to upgrade the plan before you can join.",
    };
  });

export const getTeamOverview = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    assertCanManageTeam(context.membership.role);

    const db = getDb();
    const [members, invitations] = await Promise.all([
      listActiveMembersByCompany(db, { companyId: context.company.id }),
      listPendingInvitationsByCompany(db, { companyId: context.company.id }),
    ]);

    return { members, invitations };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidatorWithFormattedErrors(inviteMemberSchema))
  .handler(async ({ data, context }) => {
    assertCanManageTeam(context.membership.role);

    if (emailsMatch(data.email, context.user.email)) {
      throw new Error("You cannot invite yourself");
    }

    const db = getDb();

    const existingMember = await getActiveMemberByCompanyEmail(db, {
      companyId: context.company.id,
      email: data.email,
    });
    if (existingMember) {
      throw new Error("This person is already a team member");
    }

    const pendingInvite = await getPendingInvitationByEmail(db, {
      companyId: context.company.id,
      email: data.email,
    });
    if (pendingInvite) {
      throw new Error("An invitation is already pending for this email");
    }

    await revokeExpiredInvitationsByEmail(db, {
      companyId: context.company.id,
      email: data.email,
    });

    const existingUser = await getUserByEmail(db, { email: data.email });
    if (existingUser) {
      if (existingUser.role === "candidate") {
        throw new Error("This email is registered as a candidate account");
      }

      const otherMembership = await getActiveMembershipByUserId(db, {
        userId: existingUser.id,
      });
      if (otherMembership) {
        throw new Error("This person already belongs to a company");
      }
    }

    const token = newInviteToken();
    const expiresAt = inviteExpiryAt();

    const invitation = await db.begin(async (tx) => {
      const transaction = asSqlTransaction(tx);
      await lockCompanyEntitlementScope(transaction, context.company.id);
      await enforceCompanyEntitlement(transaction, context.company.id, "team.invite");

      return createInvitation(transaction, {
        companyId: context.company.id,
        email: data.email,
        role: data.role,
        token,
        invitedBy: context.userId,
        expiresAt,
      });
    });

    if (!invitation) {
      throw new Error("Failed to create invitation");
    }

    try {
      await sendCompanyInviteEmail({
        to: data.email,
        companyName: context.company.name,
        inviterName: context.user.name,
        role: data.role,
        token,
      });
    } catch {
      await revokeInvitationQuery(db, {
        id: invitation.id,
        companyId: context.company.id,
      });
      throw new Error("Failed to send invitation email. Please try again.");
    }

    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(invitationIdSchema))
  .handler(async ({ data, context }) => {
    assertCanManageTeam(context.membership.role);

    const db = getDb();
    const revoked = await revokeInvitationQuery(db, {
      id: data.invitationId,
      companyId: context.company.id,
    });

    if (!revoked) {
      throw new Error("Invitation not found or already handled");
    }

    return {};
  });

export const resendInvitation = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(invitationIdSchema))
  .handler(async ({ data, context }) => {
    assertCanManageTeam(context.membership.role);

    const db = getDb();
    const token = newInviteToken();
    const expiresAt = inviteExpiryAt();

    const updated = await resetInvitationForResend(db, {
      id: data.invitationId,
      companyId: context.company.id,
      token,
      expiresAt,
    });

    if (!updated) {
      throw new Error("Invitation not found or already handled");
    }

    try {
      await sendCompanyInviteEmail({
        to: updated.email,
        companyName: context.company.name,
        inviterName: context.user.name,
        role: updated.role as "admin" | "member",
        token: updated.token,
      });
    } catch {
      throw new Error("Failed to resend invitation email. Please try again.");
    }

    return { expiresAt };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(memberIdSchema))
  .handler(async ({ data, context }) => {
    assertCanManageTeam(context.membership.role);

    const db = getDb();
    const target = await getMembershipById(db, { id: data.memberId });

    if (!target || target.companyId !== context.company.id || target.status !== "active") {
      throw new Error("Team member not found");
    }

    if (target.role === "owner") {
      throw new Error("Cannot remove the company owner");
    }

    if (target.userId === context.userId) {
      throw new Error("You cannot remove yourself from the team");
    }

    const removed = await removeCompanyMember(db, {
      id: data.memberId,
      companyId: context.company.id,
    });

    if (!removed) {
      throw new Error("Failed to remove team member");
    }

    // The removed user keeps their global `company` role; with no active
    // membership, `_authenticated` routes them to /onboarding/no-workspace
    // on their next navigation. We intentionally don't null their role —
    // one email maps to one role, and acceptInvite reactivates them on
    // re-invite.
    return {};
  });

export const transferOwnership = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(memberIdSchema))
  .handler(async ({ data, context }) => {
    assertCompanyOwner(context.membership.role);

    const db = getDb();
    const target = await getMembershipById(db, { id: data.memberId });

    if (!target || target.companyId !== context.company.id || target.status !== "active") {
      throw new Error("Team member not found");
    }

    if (target.role === "owner") {
      throw new Error("This member is already the owner");
    }

    if (target.userId === context.userId) {
      throw new Error("You are already the owner");
    }

    await db.begin(async (tx) => {
      const transaction = asSqlTransaction(tx);

      const demoted = await updateCompanyMemberRole(transaction, {
        role: "admin",
        id: context.membership.id,
        companyId: context.company.id,
      });
      const promoted = await updateCompanyMemberRole(transaction, {
        role: "owner",
        id: data.memberId,
        companyId: context.company.id,
      });
      const updatedCompany = await updateCompanyOwner(transaction, {
        ownerId: target.userId,
        id: context.company.id,
      });

      if (!demoted || !promoted || !updatedCompany) {
        throw new Error("Failed to transfer ownership");
      }
    });

    return {};
  });

export const leaveCompany = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    if (context.membership.role === "owner") {
      throw new Error("Transfer ownership before leaving the team");
    }

    const db = getDb();
    const removed = await removeCompanyMember(db, {
      id: context.membership.id,
      companyId: context.company.id,
    });

    if (!removed) {
      throw new Error("Failed to leave team");
    }

    // Clear this user's session so they're signed out immediately. Their
    // global `company` role is kept; re-invite reactivates the membership.
    await clearSession(sessionConfig);
    return {};
  });
