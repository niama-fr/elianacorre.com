import type { AdminMutationCtx } from "@ec/backend/convex/zod";
import type { QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { Ebooks } from "@ec/domain/schemas/ebooks";
import { zStoragePdfDoc } from "@ec/domain/schemas/storage";
import type { WithNow } from "@ec/domain/schemas/utils";
import { ConvexError } from "convex/values";

// TRANSFORMS ------------------------------------------------------------------------------------------------------------------------------
export const ebookFromDoc = async (ctx: QueryCtx, doc: Ebooks["Doc"]): Promise<Ebooks["Entry"]> => {
  const [file, url] = await Promise.all([ctx.db.system.get("_storage", doc.storageId), ctx.storage.getUrl(doc.storageId)]);
  return { ...doc, size: file?.size ?? null, url };
};

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbook = async (ctx: QueryCtx, id: Id<"ebooks">) => await ctx.db.get("ebooks", id);

export const getLatestEbook = async (ctx: QueryCtx) => await ctx.db.query("ebooks").withIndex("by_version").order("desc").first();

export const getPublishedEbook = async (ctx: QueryCtx) =>
  await ctx.db
    .query("ebooks")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .unique();

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireEbook = async (ctx: QueryCtx, id: Id<"ebooks">) => {
  const doc = await ctx.db.get("ebooks", id);
  if (!doc) throw new ConvexError("UNKNOWN_EBOOK");
  return doc;
};

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listEbooks = async (ctx: QueryCtx) => {
  const docs = await ctx.db.query("ebooks").withIndex("by_version").order("desc").collect();
  return await Promise.all(docs.map(async (doc) => await ebookFromDoc(ctx, doc)));
};

export const listPublishedEbooks = async (ctx: QueryCtx) =>
  await ctx.db
    .query("ebooks")
    .withIndex("by_status", (q) => q.eq("status", "published"))
    .collect();

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbook = async (ctx: AdminMutationCtx, { now, ...payload }: WithNow<Ebooks["Create"]>) => {
  const storageDoc = await ctx.db.system.get("_storage", payload.storageId);
  const parsed = zStoragePdfDoc.safeParse(storageDoc);

  if (!parsed.success) throw new ConvexError("INVALID_STORAGE_DOC");

  const latest = await getLatestEbook(ctx);
  return await ctx.db.insert("ebooks", {
    ...payload,
    publishedAt: null,
    publishedBy: null,
    status: "draft",
    updatedAt: now,
    uploadedBy: ctx.profile._id,
    version: (latest?.version ?? 0) + 1,
  });
};

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchEbook = async (ctx: AdminMutationCtx, id: Id<"ebooks">, patch: Partial<Ebooks["Fields"]>) => {
  await ctx.db.patch("ebooks", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markEbookArchived = async (ctx: AdminMutationCtx, id: Id<"ebooks">, { now }: WithNow) => {
  await patchEbook(ctx, id, { status: "archived", updatedAt: now });
};

export const markEbookPublished = async (ctx: AdminMutationCtx, id: Id<"ebooks">, { now }: WithNow) => {
  await patchEbook(ctx, id, { publishedAt: now, publishedBy: ctx.profile._id, status: "published", updatedAt: now });
};
