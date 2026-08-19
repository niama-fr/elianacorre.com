import { internal } from "@ec/backend/api";
import { Effect as E, Layer as L } from "effect";
import z from "zod";

import { ORPHAN_STORAGE_GRACE_MS, purgeOrphanStorageBatch } from "../business/storage";
import { CurrentAdmin, currentAdminLayer } from "../runtime/current-profile";
import { StorageWriter, storageWriterLayer } from "../runtime/storage";
import { generateUploadUrl as generateUploadUrlDefinition } from "../runtime/storage-contract";
import { mutation } from "./_generated/server";
import { zInternalMutation } from "./zod";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const generateUploadUrl = generateUploadUrlDefinition.register(mutation, {
  handler: E.fn(function* () {
    yield* CurrentAdmin;
    const storage = yield* StorageWriter;
    return yield* storage.generateUploadUrl;
  }),
  layer: (ctx) => L.merge(currentAdminLayer(ctx), storageWriterLayer(ctx)),
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
