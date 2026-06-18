import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
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
  ],
});

// biome-ignore lint/style/noDefaultExport: <uh>
export default config;

