import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  EDGE_WORKER_SECRET: z.string(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
});

export function validateEnv(env: unknown) {
  return envSchema.parse(env);
}
