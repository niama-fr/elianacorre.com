import { zAuthenticatedQuery } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const current = zAuthenticatedQuery({
  args: {},
  handler: (ctx) => ctx.profile,
});
