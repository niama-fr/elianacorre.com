import type { Id } from "@ec/backend/types";
import { Effect as E, Option as O } from "effect";

import { getEbookByStorageId } from "../data/ebooks";
import { deleteStorage, paginateStorageBefore } from "../data/storage";
import { getTravelPackByCoverStorageId, getTravelPackByPdfStorageId } from "../data/travel-packs";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const ORPHAN_STORAGE_GRACE_MS = 24 * 60 * 60 * 1000;
const STORAGE_GC_BATCH_SIZE = 50;

// PURGE -----------------------------------------------------------------------------------------------------------------------------------
export const purgeOrphanStorageBatch = E.fn(function* ({ before, cursor }: { before: number; cursor: string | null }) {
  const page = yield* paginateStorageBefore({ cursor, numItems: STORAGE_GC_BATCH_SIZE }, before);
  let deleted = 0;
  for (const file of page.page) {
    if (yield* isStorageReferenced(file._id)) continue;
    if (yield* deleteOrphanStorage(file._id)) deleted += 1;
  }
  return { cursor: page.isDone ? null : page.continueCursor, deleted, done: page.isDone };
});

// INTERNAL -------------------------------------------------------------------------------------------------------------------------------
const deleteOrphanStorage = E.fn(function* (id: Id<"_storage">) {
  return yield* deleteStorage(id).pipe(
    E.as(true),
    E.catchTag("BlobNotFoundError", () => E.succeed(false))
  );
});

// Keep this exhaustive when a new application-owned field starts referencing Convex storage.
const isStorageReferenced = E.fn(function* (storageId: Id<"_storage">) {
  const [ebook, travelPackCover, travelPackPdf] = yield* E.all([
    getEbookByStorageId(storageId),
    getTravelPackByCoverStorageId(storageId),
    getTravelPackByPdfStorageId(storageId),
  ]);
  return O.isSome(ebook) || O.isSome(travelPackCover) || O.isSome(travelPackPdf);
});
