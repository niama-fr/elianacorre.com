import { zEbookCreate } from "@ec/domain/schemas/ebooks";
import { zDocRef } from "@ec/domain/schemas/utils";

import { zAdminMutation, zAdminQuery } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const readAll = zAdminQuery({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("ebooks").withIndex("by_version").order("desc").collect();
    return await Promise.all(
      docs.map(async ({ storageId, ...doc }) => {
        const [file, url] = await Promise.all([ctx.db.system.get("_storage", storageId), ctx.storage.getUrl(storageId)]);
        return { ...doc, size: file?.size ?? null, url };
      })
    );
  },
});

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const create = zAdminMutation({
  args: zEbookCreate,
  handler: async (ctx, args) => {
    const latest = await ctx.db.query("ebooks").withIndex("by_version").order("desc").first();
    const now = Date.now();
    return await ctx.db.insert("ebooks", {
      ...args,
      publishedAt: null,
      publishedBy: null,
      status: "draft",
      updatedAt: now,
      uploadedBy: ctx.profile._id,
      version: (latest?.version ?? 0) + 1,
    });
  },
});

export const generateUploadUrl = zAdminMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const publish = zAdminMutation({
  args: zDocRef("ebooks"),
  handler: async (ctx, { _id }) => {
    const doc = await ctx.db.get("ebooks", _id);
    if (!doc) throw new Error("E-book was not found");
    if (doc.status === "published") return _id;

    const now = Date.now();

    const publishedDocs = await ctx.db
      .query("ebooks")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    await Promise.all(
      publishedDocs.map(async (publishedDoc) => {
        await ctx.db.patch(publishedDoc._id, { status: "archived", updatedAt: now });
      })
    );

    await ctx.db.patch(doc._id, { publishedAt: now, publishedBy: ctx.profile._id, status: "published", updatedAt: now });
    return doc._id;
  },
});
