import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  EDGE_WORKER_SECRET: z.string(),
  AI_GATEWAY_ID: z.string().min(1).default("default"),
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string().email(),
});

export function validateEnv(env: unknown) {
  return envSchema.parse(env);
}
