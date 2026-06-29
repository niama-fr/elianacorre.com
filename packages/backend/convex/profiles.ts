import { ConvexError } from "convex/values";

import { env } from "./_generated/server";
import { zInternalMutation } from "./zod";

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const seed = zInternalMutation({
  args: {},
  handler: async (ctx) => {
    const parsed = JSON.parse(env.WHITELIST_SEED) as string[];
    if (!Array.isArray(parsed)) throw new ConvexError("WHITELIST_SEED must be an array of strings.");

    const admins = await ctx.db
      .query("profiles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    for (const email of parsed)
      if (!admins.some((admin) => admin.email === email)) await ctx.db.insert("profiles", { email, role: "admin", userId: null });
  },
});
