import { serverEnv } from "./env.server";

export type SessionData = {
  userId: string;
};

export const sessionConfig = {
  password: serverEnv.SESSION_SECRET,
  name: "rz-session",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};
