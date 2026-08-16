import type { AuthenticatedMutationCtx } from "@ec/backend/convex/zod";
import type { QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { TravelPacks } from "@ec/domain/schemas/travel-packs";
import { ConvexError } from "convex/values";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getTravelPack = async (ctx: QueryCtx, id: Id<"travelPacks">) => await ctx.db.get("travelPacks", id);

export const getTravelPackBySlug = async (ctx: QueryCtx, slug: string) =>
  await ctx.db
    .query("travelPacks")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

export const requireTravelPack = async (ctx: QueryCtx, id: Id<"travelPacks">) => {
  const doc = await getTravelPack(ctx, id);
  if (!doc) throw new ConvexError("UNKNOWN_TRAVEL_PACK");
  return doc;
};

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const takeTravelPacks = async (ctx: QueryCtx, limit: number) =>
  await ctx.db.query("travelPacks").withIndex("by_updated_at").order("desc").take(limit);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createTravelPack = async (ctx: AuthenticatedMutationCtx, fields: TravelPacks["Fields"]) =>
  await ctx.db.insert("travelPacks", fields);

// PATCH -----------------------------------------------------------------------------------------------------------------------------------

export const patchTravelPack = async (ctx: AuthenticatedMutationCtx, id: Id<"travelPacks">, patch: Partial<TravelPacks["Fields"]>) => {
  await ctx.db.patch("travelPacks", id, patch);
};
