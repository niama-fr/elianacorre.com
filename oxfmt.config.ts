import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ".agents/**",
    "apps/solid/src/routeTree.gen.ts",
    "apps/solid2/src/routeTree.gen.ts",
    "packages/backend/convex/_generated/**",
    "packages/kobalte2/src/**",
    "packages/solid-presence2/src/**",
    "packages/solid-prevent-scroll2/src/**",
    "packages/solid-primitives2/src/**",
    "packages/ui/src/raw/**",
    "packages/ui2/src/raw/**",
    "packages/unpic-solid2/src/**",
    "skills-lock.json",
  ],
  printWidth: 140,
});
