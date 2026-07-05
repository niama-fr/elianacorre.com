import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [core, react, tanstack, vitest],
  ignorePatterns: [...(core.ignorePatterns ?? []), ".agents/**", "apps/web/src/routeTree.gen.ts", "packages/backend/convex/_generated/**"],
  options: {
    typeAware: true,
  },
  plugins: ["jsx-a11y"],
  rules: {
    "consistent-return": "off",
    curly: ["error", "multi"],
    "eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        fix: { imports: "safe-fix", variables: "off" },
        varsIgnorePattern: "^_",
      },
    ],
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
    "no-empty-function": ["error", { allow: ["arrowFunctions"] }],
    "no-use-before-define": ["error", { functions: false, typedefs: false }],
    "typescript/consistent-type-definitions": ["error", "type"],
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/strict-boolean-expressions": "off",
    "typescript/strict-void-return": "off",
    "unicorn/filename-case": "off",
  },
});
