import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { EbookDownloads } from "@ec/domain/schemas/ebook-downloads";
import type { PaginationOptions } from "convex/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbookDownload = async (ctx: QueryCtx, id: Id<"ebookDownloads">) => await ctx.db.get("ebookDownloads", id);

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateExpiredEbookDownloads = async (ctx: QueryCtx, pagination: PaginationOptions, before: number) =>
  await ctx.db
    .query("ebookDownloads")
    .withIndex("by_creation_time", (q) => q.lte("_creationTime", before))
    .paginate(pagination);

export const takeEbookIssuanceDownloads = async (ctx: QueryCtx, limit: number, ebookIssuanceId: Id<"ebookIssuances">) =>
  await ctx.db
    .query("ebookDownloads")
    .withIndex("by_ebook_issuance_id", (q) => q.eq("ebookIssuanceId", ebookIssuanceId))
    .take(limit);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookDownload = async (ctx: MutationCtx, create: EbookDownloads["Create"]) =>
  await ctx.db.insert("ebookDownloads", create);

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteEbookDownload = async (ctx: MutationCtx, id: Id<"ebookDownloads">) => {
  await ctx.db.delete("ebookDownloads", id);
};
