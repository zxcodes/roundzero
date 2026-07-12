import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    server: { port: 3000 },
    resolve: { tsconfigPaths: true },
    build: {
      rollupOptions: {
        onLog(level, log, defaultHandler) {
          if (log.code === "INVALID_ANNOTATION" && log.message?.includes("@hugeicons")) {
            return;
          }
          defaultHandler(level, log);
        },
      },
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      tailwindcss(),
      tanstackStart({ srcDirectory: "app" }),
      viteReact(),
      babel({ presets: [reactCompilerPreset()] }),
      sentryTanstackStart({
        org: "roundzero-a4",
        project: "roundzero",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        sourcemaps: { disable: process.env.CLOUDFLARE_ENV !== "production" },
        telemetry: false,
      }),
    ],
  };
});
