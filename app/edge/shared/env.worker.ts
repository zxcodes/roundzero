import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "staging", "test"]).default("development"),
  DATABASE_URL: z.string(),
  EDGE_WORKER_SECRET: z.string(),
  APP_URL: z.url(),
  AI_GATEWAY_ID: z.string().min(1).default("default"),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string().email(),
});

export function validateEnv(env: unknown) {
  return envSchema.parse(env);
}
