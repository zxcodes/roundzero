import { vi } from "vitest";

const connectionString =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:password@localhost:6312/postgres?sslmode=disable";

export const env = {
  EMAIL: {
    send: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
  },
  HYPERDRIVE: {
    connectionString,
  },
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? "test-openrouter-key",
  AI_GATEWAY_TOKEN: process.env.AI_GATEWAY_TOKEN ?? "",
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
  AI_GATEWAY_ID: process.env.AI_GATEWAY_ID ?? "",
  BATCH_ORCHESTRATION: { create: vi.fn().mockResolvedValue(undefined) },
  POST_EVALUATION: { create: vi.fn().mockResolvedValue(undefined) },
  PRE_EVALUATION: { create: vi.fn().mockResolvedValue(undefined) },
};
