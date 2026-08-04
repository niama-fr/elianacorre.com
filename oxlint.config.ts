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
  overrides: [
    {
      // Convex mutations sometimes must serially invalidate related capabilities in one transaction.
      files: ["packages/backend/**/*.ts"],
      rules: {
        "no-await-in-loop": "off",
      },
    },
    {
      files: ["packages/backend/convex/**/*.ts"],
      rules: {
        "unicorn/filename-case": "off",
      },
    },
  ],
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
    "no-console": "error",
    "no-empty-function": ["error", { allow: ["arrowFunctions"] }],
    "no-use-before-define": ["error", { functions: false, typedefs: false }],
    "react/button-has-type": "off",
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "function-declaration",
      },
    ],
    "react/hook-use-state": "off",
    "typescript/consistent-type-definitions": ["error", "type"],
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/strict-boolean-expressions": "off",
    "typescript/strict-void-return": "off",
  },
});
