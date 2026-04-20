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

  // R2 Keys
  R2_ACCOUNT_ID: z.string(),
  R2_BUCKET_NAME: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),

  // Stripe Keys
  STRIPE_PUBLISHABLE_KEY: z.string(),
  STRIPE_SECRET_KEY: z.string(),
});

export const serverEnv = envSchema.parse(process.env);

export type ServerENV = keyof typeof serverEnv;
