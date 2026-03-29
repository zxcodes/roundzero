export type SessionData = {
  userId: string;
};

export const sessionConfig = {
  password: process.env.SESSION_SECRET!,
  name: "hirely-session",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};
