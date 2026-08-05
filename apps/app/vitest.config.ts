import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    env: {
      VITE_CONVEX_URL: "https://exact-deployment.convex.cloud",
    },
  },
});
