import type { MutationCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";

import { getEbookByStorageId } from "../data/ebooks";
import { deleteStorage, paginateStorageBefore } from "../data/storage";
import { getTravelPackByCoverStorageId, getTravelPackByPdfStorageId } from "../data/travel-packs";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const ORPHAN_STORAGE_GRACE_MS = 24 * 60 * 60 * 1000;
const STORAGE_GC_BATCH_SIZE = 50;

// PURGE -----------------------------------------------------------------------------------------------------------------------------------
export async function purgeOrphanStorageBatch(ctx: MutationCtx, { before, cursor }: { before: number; cursor: string | null }) {
  const page = await paginateStorageBefore(ctx, { cursor, numItems: STORAGE_GC_BATCH_SIZE }, before);
  let deleted = 0;

  for (const file of page.page) {
    if (await isStorageReferenced(ctx, file._id)) continue;
    await deleteStorage(ctx, file._id);
    deleted += 1;
  }

  return { cursor: page.isDone ? null : page.continueCursor, deleted, done: page.isDone };
}

// INTERNAL -------------------------------------------------------------------------------------------------------------------------------
// Keep this exhaustive when a new application-owned field starts referencing Convex storage.
async function isStorageReferenced(ctx: MutationCtx, storageId: Id<"_storage">) {
  const [ebook, travelPackCover, travelPackPdf] = await Promise.all([
    getEbookByStorageId(ctx, storageId),
    getTravelPackByCoverStorageId(ctx, storageId),
    getTravelPackByPdfStorageId(ctx, storageId),
  ]);

  return !!ebook || !!travelPackCover || !!travelPackPdf;
}
