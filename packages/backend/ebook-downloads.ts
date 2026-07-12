import type { EbookDownloads } from "@ec/domain/schemas/ebook-downloads";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbookDownload = async (ctx: QueryCtx, id: Id<"ebookDownloads">) => await ctx.db.get("ebookDownloads", id);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookDownload = async (ctx: MutationCtx, create: EbookDownloads["Create"]) =>
  await ctx.db.insert("ebookDownloads", create);
