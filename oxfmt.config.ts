import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [".agents/**", "apps/web/src/routeTree.gen.ts", "packages/backend/convex/_generated/**", "skills-lock.json"],
  printWidth: 140,
});
