import z from "zod";

// ADAPTERS --------------------------------------------------------------------------------------------------------------------------------
export const zAuthAdapter = z.literal(["better-auth"]);
export const authAdapterSet = zAuthAdapter.values;
