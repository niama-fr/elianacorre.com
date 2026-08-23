import { componentsGeneric } from "convex/server";

export type Components = {
  "betterAuth": import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  "loops": import("@devwithbobby/loops/_generated/component.js").ComponentApi<"loops">;
  "rateLimiter": import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  "workflow": import("@convex-dev/workflow/_generated/component.js").ComponentApi<"workflow">;
};

export const components: Components = componentsGeneric() as any;
