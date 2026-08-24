import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

const vitestTestsOnly = {
  ...vitest,
  overrides: vitest.overrides?.map((override) => ({
    ...override,
    files: ["**/*.test.{ts,tsx,js,jsx}", "**/__tests__/**/*.{ts,tsx,js,jsx}"],
  })),
};

export default defineConfig({
  extends: [core, react, tanstack, vitestTestsOnly],
  ignorePatterns: [
    ...(core.ignorePatterns ?? []),
    ".agents/**",
    "apps/web/src/routeTree.gen.ts",
    "packages/backend/confect/_generated/**",
    "packages/backend/convex/**",
  ],
  options: {
    typeAware: true,
  },
  overrides: [
    {
      files: ["apps/web/**/*.{ts,tsx}"],
      rules: {
        "eslint/no-restricted-imports": [
          "error",
          {
            paths: [
              { message: "Better Auth belongs to apps/app.", name: "@convex-dev/better-auth" },
              { message: "Reactive Convex Query belongs to apps/app.", name: "@convex-dev/react-query" },
              { message: "TanStack Query belongs to apps/app.", name: "@tanstack/react-query" },
              { message: "Better Auth belongs to apps/app.", name: "better-auth" },
              { message: "Reactive Convex clients belong to apps/app.", name: "convex/react" },
            ],
            patterns: [
              { group: ["../**"], message: "Use the @ alias; parent imports can cross the application boundary." },
              {
                group: ["@better-auth/*", "@convex-dev/better-auth/*", "better-auth/*"],
                message: "Better Auth belongs to apps/app.",
              },
              {
                group: ["@convex-dev/react-query/*", "@tanstack/react-query/*", "convex/react*"],
                message: "Authenticated reactive data clients belong to apps/app.",
              },
              {
                group: [
                  "@ec/app",
                  "@ec/app/*",
                  "apps/app",
                  "apps/app/*",
                  "@/routes/admin",
                  "@/routes/admin/*",
                  "@/routes/members",
                  "@/routes/members/*",
                  "@/routes/_authenticated*",
                ],
                message: "Authenticated, administration, and member implementation belongs to apps/app.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["packages/backend/**/*.ts", "packages/domain/**/*.ts"],
      jsPlugins: ["oxlint-plugin-effect/plugin"],
      rules: {
        // ...effect,
        "max-classes-per-file": "off",
        "no-await-in-loop": "off",
        "no-use-before-define": "off",
        "unicorn/filename-case": "off",
        "unicorn/no-array-method-this-argument": "off",
        "unicorn/throw-new-error": "off",
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
    "func-names": ["error", "always", { generators: "never" }],
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
