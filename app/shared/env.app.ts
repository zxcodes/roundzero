import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "staging", "test"]).default("development"),

  DATABASE_URL: z.string(),
  TEST_DATABASE_URL: z.string().optional(),

  APP_URL: z.url(),

  SESSION_SECRET: z.string(),

  // Cloudflare Email Service — from address must use an onboarded sending domain.
  EMAIL_FROM: z.email(),

  // Polar
  POLAR_ACCESS_TOKEN: z.string(),
  POLAR_WEBHOOK_SECRET: z.string(),
  POLAR_MODE: z.enum(["sandbox", "production"]).default("sandbox"),
  POLAR_PRODUCT_ID_STARTER: z.string(),
  POLAR_PRODUCT_ID_GROWTH: z.string(),
  POLAR_PRODUCT_ID_SCALE: z.string(),

  // Comma-separated platform admin emails; empty disables /admin access.
  PLATFORM_ADMIN_EMAILS: z.string().default(""),
});

export const appEnv = envSchema.parse(process.env);

export const isDev = appEnv.NODE_ENV === "development";
export const isStaging = appEnv.NODE_ENV === "staging";
export const isProd = appEnv.NODE_ENV === "production";
