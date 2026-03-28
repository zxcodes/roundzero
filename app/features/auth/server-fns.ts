import { createServerFn } from "@tanstack/react-start";
import { clearSession, updateSession, useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { userRoleSchema } from "@/shared/enums";
import {
  getUserById,
  setUserRole as setUserRoleQuery,
  upsertUserByGoogleId,
} from "./queries/queries_sql";

type SessionData = {
  userId: string;
};

const sessionConfig = {
  password: process.env.SESSION_SECRET!,
  name: "hirely-session",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

const googleAuthSchema = z.object({
  access_token: z.string().min(1),
});

export const loginWithGoogle = createServerFn({ method: "POST" })
  .inputValidator((data: { access_token: string }) => googleAuthSchema.parse(data))
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

const setRoleSchema = z.object({
  role: userRoleSchema,
});

export const setRole = createServerFn({ method: "POST" })
  .inputValidator((data: { role: string }) => setRoleSchema.parse(data))
  .handler(async ({ data }) => {
    const session = await useSession<SessionData>(sessionConfig);

    if (!session.data.userId) {
      throw new Error("Not authenticated");
    }

    const db = getDb();
    const user = await setUserRoleQuery(db, {
      role: data.role,
      id: session.data.userId,
    });

    if (!user) {
      throw new Error("Failed to set role — role may already be set");
    }

    return { user };
  });
