import { appEnv } from "./env.app";

export type SessionData = {
  userId: string;
};

export const sessionConfig = {
  password: appEnv.SESSION_SECRET,
  name: "rz-session",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};
