import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

// oxlint-disable-next-line import/no-default-export -- Vitest config files require a default export.
export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./app", import.meta.url).pathname,
    },
  },
  plugins: [
    cloudflareTest({
      main: "./workers-tests/voice-agent.worker.ts",
      additionalExports: { VoiceAssessmentAgent: "DurableObject" },
      miniflare: {
        compatibilityDate: "2026-07-16",
        compatibilityFlags: ["nodejs_compat"],
        ai: { binding: "AI" },
        bindings: {
          NODE_ENV: "test",
          APP_URL: "https://roundzero.test",
          SESSION_SECRET: "workers-test-session-secret-at-least-32-characters",
          EMAIL_FROM: "test@roundzero.test",
          POLAR_ACCESS_TOKEN: "test-polar-token",
          POLAR_WEBHOOK_SECRET: "test-polar-webhook-secret",
          POLAR_MODE: "sandbox",
          POLAR_PRODUCT_ID_STARTER: "starter",
          POLAR_PRODUCT_ID_GROWTH: "growth",
          POLAR_PRODUCT_ID_SCALE: "scale",
          PLATFORM_ADMIN_EMAILS: "",
          OPENROUTER_API_KEY: "test-openrouter-key",
          CLOUDFLARE_ACCOUNT_ID: "",
          AI_GATEWAY_ID: "",
          AI_GATEWAY_TOKEN: "",
        },
        durableObjects: {
          VoiceAssessmentAgent: {
            className: "VoiceAssessmentAgent",
            useSQLite: true,
          },
        },
        hyperdrives: {
          HYPERDRIVE: "postgres://postgres:password@localhost:6312/postgres?sslmode=disable",
        },
      },
    }),
  ],
  test: {
    include: ["workers-tests/**/*.test.ts"],
  },
});
