import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { EbookIssuances } from "@ec/domain/schemas/ebook-issuances";

// GET ----------------------------------------------------------------------------------------------------------------------------------
export const getEbookIssuance = async (ctx: QueryCtx, id: Id<"ebookIssuances">) => await ctx.db.get("ebookIssuances", id);

export const getLatestEbookIssuance = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("ebookIssuances")
    .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
    .order("desc")
    .first();

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookIssuance = async (ctx: MutationCtx, payload: EbookIssuances["Create"]) =>
  await ctx.db.insert("ebookIssuances", payload);
