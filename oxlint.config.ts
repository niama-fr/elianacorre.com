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
    "typescript/no-confusing-void-expression": "off",
    "typescript/no-floating-promises": "off",
    "typescript/no-unsafe-argument": "off",
    "typescript/no-unsafe-assignment": "off",
    "typescript/no-unsafe-call": "off",
    "typescript/no-unsafe-member-access": "off",
    "typescript/no-unsafe-return": "off",
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/only-throw-error": "off",
    "typescript/promise-function-async": "off",
    "typescript/strict-boolean-expressions": "off",
    "typescript/strict-void-return": "off",
  },
});
