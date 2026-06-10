import { createServerFn } from "@tanstack/react-start";
import { clearSession, updateSession, useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getCandidateProfileByUserId } from "@/features/candidates/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { userRoleSchema } from "@/shared/enums";
import { authMiddleware } from "@/shared/middleware";
import { type SessionData, sessionConfig } from "@/shared/session";
import { requiredTrimmedString } from "@/shared/validation";
import {
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

export const loginWithGoogle = createServerFn({ method: "POST" })
  .validator(zodValidator(googleAuthSchema))
  .handler(async ({ data }) => {
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch Google user info");
    }

    const googleUser = (await userResponse.json()) as {
      id: string;
      email: string;
      name: string;
      picture: string;
    };

    const db = getDb();
    const user = await upsertUserByGoogleId(db, {
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      googleId: googleUser.id,
    });

    if (!user) {
      throw new Error("Failed to create or update user");
    }

    // Restore soft-deleted user signing back in
    let restored = false;
    if (user.deletedAt) {
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
        activeUser = updated;
      }
    }

    await updateSession<SessionData>(sessionConfig, { userId: activeUser.id });

    let onboardingComplete = false;
    if (activeUser.role === "company") {
      const company = await getCompanyByOwnerId(db, { ownerId: activeUser.id });
      onboardingComplete = Boolean(company?.onboardingCompletedAt);
    } else if (activeUser.role === "candidate") {
      const profile = await getCandidateProfileByUserId(db, { userId: activeUser.id });
      onboardingComplete = Boolean(profile?.onboardingCompletedAt);
    }

    return { user: activeUser, onboardingComplete, restored };
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
  return user;
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
