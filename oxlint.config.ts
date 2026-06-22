import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import solid from "ultracite/oxlint/solid";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, solid, tanstack, vitest],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
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
  ],
  rules: {
    curly: ["error", "multi"],
    "func-style": "off",
    "import/consistent-type-specifier-style": "off",
    "no-use-before-define": ["error", { functions: false, typedefs: false }],
    "typescript/consistent-type-definitions": ["error", "type"],
  },
});
