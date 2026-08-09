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
              { group: ["@convex-dev/better-auth/*", "better-auth/*"], message: "Better Auth belongs to apps/app." },
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
