import { z } from "@ec/validation/zod";
import { createServerOnlyFn } from "@tanstack/react-start";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const zPublicEnv = z.object({
  VITE_CONVEX_SITE_URL: z.url(),
  VITE_CONVEX_URL: z.url(),
});

const zServerEnv = z.object({
  CSP_MODE: z.literal(["enforce", "report-only"]).default("report-only"),
});

// ENV -------------------------------------------------------------------------------------------------------------------------------------
export const publicEnv = zPublicEnv.parse(import.meta.env);

export const getServerEnv = createServerOnlyFn(() => zServerEnv.parse(process.env));
