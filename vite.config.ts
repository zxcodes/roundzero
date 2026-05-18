import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
  server: { port: 3000 },
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({ srcDirectory: "app" }),
    viteReact(),
    babel({ presets: [reactCompilerPreset(), decoratorPreset({ version: "2023-11" })] }),
  ],
});

// biome-ignore lint/style/noDefaultExport: <uh>
export default config;

// This is required because somehow vite 8 has issues with decorators.
function decoratorPreset(options: Record<string, unknown>) {
  return {
    preset: () => ({ plugins: [["@babel/plugin-proposal-decorators", options]] }),
    rolldown: {
      // Only run this transform if the file contains a decorator.
      filter: { code: "@" },
    },
  };
}
