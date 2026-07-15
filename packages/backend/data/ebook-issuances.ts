import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { EbookIssuances } from "@ec/domain/schemas/ebook-issuances";

import { ebookFromDoc, requireEbook } from "./ebooks";

// TRANSFORMS ------------------------------------------------------------------------------------------------------------------------------
export const ebookIssuanceFromDoc = async (ctx: QueryCtx, doc: EbookIssuances["Doc"]): Promise<EbookIssuances["Entry"]> => ({
  ...doc,
  ebook: await ebookFromDoc(ctx, await requireEbook(ctx, doc.ebookId)),
});

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbookIssuance = async (ctx: QueryCtx, id: Id<"ebookIssuances">) => await ctx.db.get("ebookIssuances", id);

export const getLatestEbookIssuance = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("ebookIssuances")
    .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
    .order("desc")
    .first();

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listEbookIssuances = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("ebookIssuances")
    .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
    .order("desc")
    .collect();

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookIssuance = async (ctx: MutationCtx, payload: EbookIssuances["Create"]) =>
  await ctx.db.insert("ebookIssuances", payload);
