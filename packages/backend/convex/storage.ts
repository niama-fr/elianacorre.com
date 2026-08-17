import { internal } from "@ec/backend/api";
import z from "zod";

import { ORPHAN_STORAGE_GRACE_MS, purgeOrphanStorageBatch } from "../business/storage";
import { zAdminMutation, zInternalMutation } from "./zod";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const generateUploadUrl = zAdminMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const purgeOrphans = zInternalMutation({
  args: {
    before: z.number().nullable(),
    cursor: z.string().nullable(),
  },
  handler: async (ctx, { before, cursor }) => {
    const cutoff = before ?? Date.now() - ORPHAN_STORAGE_GRACE_MS;
    const result = await purgeOrphanStorageBatch(ctx, {
      before: cutoff,
      cursor,
    });

    if (!result.done)
      await ctx.scheduler.runAfter(0, internal.storage.purgeOrphans, {
        before: cutoff,
        cursor: result.cursor,
      });

    return result;
  },
});
