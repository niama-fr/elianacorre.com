import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ".agents/**",
    "apps/solid/src/routeTree.gen.ts",
    "apps/solid2/*",
    "packages/backend/convex/_generated/**",
    "packages/kobalte2/**",
    "packages/solid-presence2/**",
    "packages/solid-prevent-scroll2/**",
    "packages/solid-primitives2/**",
    "packages/ui/src/raw/**",
    "packages/ui2/**",
    "packages/unpic-solid2/**",
    "skills-lock.json",
  ],
  printWidth: 140,
});
