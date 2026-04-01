import { createServerFn } from "@tanstack/react-start";
import { clearSession, updateSession, useSession } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { userRoleSchema } from "@/shared/enums";
import { authMiddleware } from "@/shared/middleware";
import { type SessionData, sessionConfig } from "@/shared/session";
import { requiredTrimmedString } from "@/shared/validation";
import {
  getUserById,
  setUserRole as setUserRoleQuery,
  updateUserName as updateUserNameQuery,
  upsertUserByGoogleId,
} from "../queries/queries_sql";

const googleAuthSchema = z.object({
  access_token: z.string().min(1),
  role: userRoleSchema.optional(),
});

export const loginWithGoogle = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(googleAuthSchema))
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

    // Auto-assign role if provided and user doesn't have one yet
    if (data.role && !user.role) {
      const updated = await setUserRoleQuery(db, {
        role: data.role,
        id: user.id,
      });
      if (updated) {
        await updateSession<SessionData>(sessionConfig, { userId: updated.id });
        return { user: updated };
      }
    }

    await updateSession<SessionData>(sessionConfig, { userId: user.id });

    return { user };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  await clearSession(sessionConfig);
  return {};
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<SessionData>(sessionConfig);

  if (!session.data.userId) {
    return null;
  }

  const db = getDb();
  const user = await getUserById(db, { id: session.data.userId });
  return user;
});

const updateNameSchema = z.object({
  name: requiredTrimmedString(100, "Name is required"),
});

export const updateUserName = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(updateNameSchema))
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
