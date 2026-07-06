import type { Profiles } from "@ec/domain/schemas/profiles";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getProfile = async (ctx: QueryCtx, id: Id<"profiles">) => await ctx.db.get("profiles", id);

export const getProfileByEmail = async (ctx: QueryCtx, email: string) =>
  await ctx.db
    .query("profiles")
    .withIndex("by_email", (query) => query.eq("email", email))
    .unique();

// ENSURE ----------------------------------------------------------------------------------------------------------------------------------
export const ensureContactProfileId = async (ctx: MutationCtx, create: Omit<Profiles["Fields"], "role">) => {
  const profile = await getProfileByEmail(ctx, create.email);
  return profile?._id ?? (await ctx.db.insert("profiles", { ...create, role: "contact" }));
};
