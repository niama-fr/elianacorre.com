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
    "apps/solid2/*",
    "packages/backend/convex/_generated/**",
    "packages/kobalte2/**",
    "packages/solid-presence2/**",
    "packages/solid-prevent-scroll2/**",
    "packages/solid-primitives2/**",
    "packages/ui/src/raw/**",
    "packages/ui2/**",
    "packages/unpic-solid2/**",
  ],
  options: {
    typeAware: true,
  },
  plugins: ["jsx-a11y"],
  rules: {
    "consistent-return": "off",
    curly: ["error", "multi"],
    "func-style": "off",
    "import/consistent-type-specifier-style": "off",
    "jsx-a11y/control-has-associated-label": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    "jsx-a11y/label-has-associated-control": "error",
    "jsx-a11y/no-interactive-element-to-noninteractive-role": "error",
    "jsx-a11y/no-noninteractive-element-interactions": "error",
    "jsx-a11y/no-noninteractive-element-to-interactive-role": "error",
    "jsx-a11y/prefer-tag-over-role": "error",
    "no-console": "error",
    "no-use-before-define": ["error", { functions: false, typedefs: false }],
    "typescript/consistent-type-definitions": ["error", "type"],
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/strict-void-return": "off",
  },
});
