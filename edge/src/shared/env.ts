import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  EDGE_WORKER_SECRET: z.string(),
});

export function validateEnv(env: unknown) {
  return envSchema.parse(env);
}
