import { z } from "zod";

const edgeWorkerSecretSchema = z
  .string()
  .min(32, "EDGE_WORKER_SECRET must be at least 32 characters");

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

  // Edge Worker
  EDGE_WORKER_URL: z.url().default("http://localhost:8787"),
  EDGE_WORKER_SECRET: edgeWorkerSecretSchema,

  // Edge Worker URL for client websocket chat
  VITE_EDGE_WORKER_URL: z.url().default("http://localhost:8787"),
});

const parsedEnv = envSchema.parse(process.env);

if (
  parsedEnv.NODE_ENV !== "test" &&
  parsedEnv.EDGE_WORKER_SECRET.toLowerCase().includes("dev-secret")
) {
  throw new Error("EDGE_WORKER_SECRET must not use a dev-secret value outside tests");
}

export const serverEnv = parsedEnv;
