import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "staging", "test"]).default("development"),

  DATABASE_URL: z.string(),
  TEST_DATABASE_URL: z.string(),

  APP_URL: z.url(),

  SESSION_SECRET: z.string(),

  // Resend Keys
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.email(),

  // Polar
  POLAR_ACCESS_TOKEN: z.string(),
  POLAR_WEBHOOK_SECRET: z.string(),
  POLAR_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
  POLAR_PRODUCT_ID_PRO: z.string(),
});

export const appEnv = envSchema.parse(process.env);

export const isDev = appEnv.NODE_ENV === "development";
export const isStaging = appEnv.NODE_ENV === "staging";
export const isProd = appEnv.NODE_ENV === "production";
