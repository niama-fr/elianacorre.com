import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { NewsRestrictions } from "@ec/domain/schemas/news-restrictions";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsRestriction = async (ctx: QueryCtx, id: Id<"newsRestrictions">) => await ctx.db.get("newsRestrictions", id);

export const getActiveNewsRestriction = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsRestrictions")
    .withIndex("by_profile_id_and_resolved_at", (q) => q.eq("profileId", profileId).eq("resolvedAt", null))
    .unique();

export const getLatestNewsRestriction = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsRestrictions")
    .withIndex("by_profile_id_and_restricted_at", (q) => q.eq("profileId", profileId))
    .order("desc")
    .first();

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createProviderNewsRestriction = async (ctx: MutationCtx, payload: NewsRestrictions["Create"]) =>
  await ctx.db.insert("newsRestrictions", {
    ...payload,
    resolvedAt: null,
    resolvedBy: null,
    restrictedAt: payload.lastOccurredAt,
    restrictedBy: "provider",
    version: 1,
  });

// PATCH ----------------------------------------------------------------------------------------------------------------------------------
export const patchNewsRestriction = async (ctx: MutationCtx, id: Id<"newsRestrictions">, patch: Partial<NewsRestrictions["Fields"]>) => {
  await ctx.db.patch("newsRestrictions", id, patch);
};
