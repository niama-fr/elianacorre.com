/// <reference types="vite/client" />

const convexModules = import.meta.glob(["../../convex/**/*.ts", "../../convex/_generated/**/*.js"]);

export const modules = Object.fromEntries(
  Object.entries(convexModules).map(([path, module]) => [path.replace("../../convex/", "./"), module])
);
