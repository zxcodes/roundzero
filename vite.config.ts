import { readFileSync } from "node:fs";

import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function stripBadSourcemapsPlugin(): Plugin {
  // TanStack and seroval packages ship //# sourceMappingURL comments but omit the
  // .map files from npm. Vite tries to read them and logs ENOENT for every import.
  const packages = [
    "@tanstack/react-start",
    "@tanstack/react-start-server",
    "@tanstack/react-router",
    "@tanstack/router-core",
    "@tanstack/history",
    "@tanstack/start-server-core",
    "@tanstack/start-client-core",
    "@tanstack/start-fn-stubs",
    "@tanstack/start-storage-context",
    "@tanstack/react-start-client",
    "seroval",
    "seroval-plugins",
  ];

  return {
    name: "strip-bad-sourcemaps",
    load(id) {
      if (!id.includes("node_modules")) return;
      if (!packages.some((pkg) => id.includes(pkg))) return;
      const path = (id.startsWith("file://") ? new URL(id).pathname : id).split("?")[0];
      return readFileSync(path, "utf-8").replace(/\/\/# sourceMappingURL=[^\n]*\n?/g, "");
    },
  };
}

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
      stripBadSourcemapsPlugin(),
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
