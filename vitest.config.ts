import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  return {
    resolve: {
      alias: {
        "@": new URL("./app", import.meta.url).pathname,
        "cloudflare:workers": new URL(
          "./app/shared/__tests__/cloudflare-workers-mock.ts",
          import.meta.url,
        ).pathname,
        "cloudflare:workflows": new URL(
          "./app/shared/__tests__/cloudflare-workers-mock.ts",
          import.meta.url,
        ).pathname,
      },
    },
    test: {
      include: ["app/**/__tests__/**/*.test.ts"],
      globals: true,
      testTimeout: 15_000,
      hookTimeout: 30_000,
      setupFiles: ["app/shared/__tests__/setup.ts"],

      // mode defines what ".env.{mode}" file to choose if exists
      // loadEnv loads all the available envs from .env
      env: loadEnv(mode, process.cwd(), ""),

      // Run all test files sequentially in a single worker to avoid
      // cross-file DB conflicts (shared Postgres, TRUNCATE in afterEach).
      // Keep module isolation enabled so file-scoped mocks cannot leak into
      // later suites that exercise the same Workflow bindings.
      maxWorkers: 1,
      fileParallelism: false,
      isolate: true,
    },
  };
});
