import type { Profiles } from "@ec/domain/schemas/profiles";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getProfile = async (ctx: QueryCtx, id: Id<"profiles">) => await ctx.db.get("profiles", id);

export const getProfileByEmail = async (ctx: QueryCtx, email: string) =>
  await ctx.db
    .query("profiles")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

export const getProfileIdByEmail = async (ctx: QueryCtx, email: string) => {
  const profile = await getProfileByEmail(ctx, email);
  return profile?._id ?? null;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createContactProfile = async (ctx: MutationCtx, create: Omit<Profiles["Fields"], "role">) =>
  await ctx.db.insert("profiles", { ...create, role: "contact" });

// ENSURE ----------------------------------------------------------------------------------------------------------------------------------
export const ensureContactProfileId = async (ctx: MutationCtx, create: Omit<Profiles["Fields"], "role">) => {
  const profile = await getProfileByEmail(ctx, create.email);
  return profile?._id ?? (await createContactProfile(ctx, create));
};
