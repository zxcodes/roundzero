import { z } from "zod";

const envSchema = z.object({
  VITE_NODE_ENV: z.enum(["development", "production", "staging", "test"]).default("development"),
  VITE_APP_URL: z.url(),
  VITE_EDGE_WORKER_URL: z.url().default("http://localhost:8787"),
  VITE_GOOGLE_CLIENT_ID: z.string(),
  VITE_PUBLIC_ASSET_BASE_URL: z.url(),
});

export const clientEnv = envSchema.parse(import.meta.env);
