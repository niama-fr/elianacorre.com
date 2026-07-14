import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { EbookDownloads } from "@ec/domain/schemas/ebook-downloads";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbookDownload = async (ctx: QueryCtx, id: Id<"ebookDownloads">) => await ctx.db.get("ebookDownloads", id);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookDownload = async (ctx: MutationCtx, create: EbookDownloads["Create"]) =>
  await ctx.db.insert("ebookDownloads", create);
