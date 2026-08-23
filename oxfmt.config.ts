import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ".agents/**",
    "apps/app/src/routeTree.gen.ts",
    "apps/web/src/routeTree.gen.ts",
    "packages/backend/confect/_generated/**",
    "packages/backend/convex/**",
    "skills-lock.json",
  ],
  printWidth: 140,
  sortTailwindcss: { functions: ["clsx", "cva", "tw", "twMerge", "cn", "twJoin", "tv"], preserveWhitespace: true },
});
