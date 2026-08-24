import type { Id } from "@ec/backend/types";
import type { PaginationOptions } from "convex/server";
import { Effect as E } from "effect";

import { DatabaseReader, StorageActionWriter, StorageReader, StorageWriter } from "../confect/_generated/services";
import { dieOnDecodeError, optionByBlob, optionById } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getStorageBlob = E.fn(function* (id: Id<"_storage">) {
  const storage = yield* StorageActionWriter;
  return yield* storage.get(id).pipe(optionByBlob);
});

export const getStorageDoc = E.fn(function* (id: Id<"_storage">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("_storage").get(id).pipe(optionById);
});

export const getStorageUrl = E.fn(function* (id: Id<"_storage">) {
  const storage = yield* StorageReader;
  return yield* storage.getUrl(id).pipe(optionByBlob);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateStorageBefore = E.fn(function* (pagination: PaginationOptions, before: number) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("_storage")
    .index("by_creation_time", (q) => q.lt("_creationTime", before), "asc")
    .paginate(pagination)
    .pipe(dieOnDecodeError);
});

export const takeStorage = E.fn(function* (limit: number) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("_storage").index("by_creation_time", "desc").take(limit).pipe(dieOnDecodeError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteStorage = E.fn(function* (id: Id<"_storage">) {
  const storage = yield* StorageWriter;
  return yield* storage.delete(id);
});

// GENERATE --------------------------------------------------------------------------------------------------------------------------------
export const generateStorageUploadUrl = E.fn(function* () {
  const storage = yield* StorageWriter;
  return yield* storage.generateUploadUrl;
});
