import { isConvexErrorCode } from "@ec/domain/helpers/errors";
import { zEbookCreate } from "@ec/domain/schemas/ebooks";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { getValidEbookIssuanceByToken } from "../ebook-issuances";
import { createEbook, getEbook, listEbooks, publishEbook } from "../ebooks";
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
    const issuance = await getValidEbookIssuanceByToken(ctx, { now: Date.now(), token });
    return issuance ? await getEbook(ctx, issuance.ebookId) : null;
  },
});
