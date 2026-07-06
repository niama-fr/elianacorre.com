import { hashToken, isConvexErrorCode } from "@ec/domain/helpers/utils";
import { zEbookCreate } from "@ec/domain/schemas/ebooks";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { getValidEbookGrant } from "../ebook-grants";
import { createEbook, getPublishedEbook, listEbooks, publishEbook } from "../ebooks";
import { hasConfirmedNewsletterSub } from "../newsletter-subs";
import { zAdminMutation, zAdminQuery, zInternalQuery } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const list = zAdminQuery({
  args: {},
  handler: async (ctx) => await listEbooks(ctx),
});

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const create = zAdminMutation({
  args: zEbookCreate,
  handler: async (ctx, args) => {
    try {
      return { data: await createEbook(ctx, { ...args, now: Date.now() }) };
    } catch (error) {
      if (!isConvexErrorCode(error, "INVALID_STORAGE_DOC")) throw error;
      await ctx.storage.delete(args.storageId);
      return { error: "INVALID_STORAGE_DOC" };
    }
  },
});

export const generateUploadUrl = zAdminMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const publish = zAdminMutation({
  args: { ebookId: zid("ebooks") },
  handler: async (ctx, { ebookId }) => await publishEbook(ctx, ebookId, { now: Date.now() }),
});

// INTERNAL QUERIES ------------------------------------------------------------------------------------------------------------------------
export const resolveDownload = zInternalQuery({
  args: { token: z.string() },
  handler: async (ctx, { token }) => {
    const grant = await getValidEbookGrant(ctx, { now: Date.now(), tokenHash: await hashToken(token) });
    if (!grant) return null;

    const hasConfirmedSub = await hasConfirmedNewsletterSub(ctx, grant.profileId);
    return hasConfirmedSub ? await getPublishedEbook(ctx) : null;
  },
});
