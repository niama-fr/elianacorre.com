import { cloudflare } from "@cloudflare/vite-plugin";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({ server: { entry: "./server.ts" } }),
    viteReact(),
    paraglideVitePlugin({
      emitTsDeclarations: true,
      outdir: "./src/paraglide",
      project: "./project.inlang",
      strategy: ["baseLocale"],
    }),
  ],
  resolve: { tsconfigPaths: true },
  ssr: {
    noExternal: ["@convex-dev/better-auth"],
  },
});
