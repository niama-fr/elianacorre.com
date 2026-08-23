import type { Id } from "@ec/backend/types";
import { EbookNotFound } from "@ec/domain/errors/ebooks";
import { MAX_SIZE } from "@ec/domain/helpers/storage";
import type { Ebooks } from "@ec/domain/schemas/ebooks";
import type { WithNow } from "@ec/domain/schemas/utils";
import { Effect as E, Option as O } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { CurrentAdmin } from "../runtime/current-profile";
import { dieOnPatchError, dieOnDecodeError, dieOnEncodeError, optionById, optionByIndex } from "./confect";
import { getStorageDoc, getStorageUrl } from "./storage";

// TRANSFORMS ------------------------------------------------------------------------------------------------------------------------------
export const ebookDtoFrom = E.fn(function* (doc: Ebooks["Doc"]) {
  const file = yield* getStorageDoc(doc.storageId);
  const url = yield* getStorageUrl(doc.storageId);
  return { ...doc, size: O.isSome(file) ? file.value.size : null, url: O.isSome(url) ? url.value.href : null };
});

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbook = E.fn(function* (id: Id<"ebooks">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("ebooks").get(id).pipe(optionById);
});

export const getEbookByStorageId = E.fn(function* (storageId: Id<"_storage">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("ebooks")
    .index("by_storage_id", (query) => query.eq("storageId", storageId))
    .first()
    .pipe(dieOnDecodeError);
});

export const getLatestEbook = E.fn(function* () {
  const reader = yield* DatabaseReader;
  return yield* reader.table("ebooks").index("by_version", "desc").first().pipe(dieOnDecodeError);
});

export const getPublishedEbook = E.fn(function* () {
  const reader = yield* DatabaseReader;
  return yield* reader.table("ebooks").get("by_status", "published").pipe(optionByIndex);
});

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireEbook = E.fn(function* (id: Id<"ebooks">) {
  return yield* O.match(yield* getEbook(id), { onNone: () => new EbookNotFound(), onSome: E.succeed });
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listEbooks = E.fn(function* () {
  const reader = yield* DatabaseReader;
  const docs = yield* reader.table("ebooks").index("by_version", "desc").collect().pipe(dieOnDecodeError);
  return yield* E.forEach(docs, ebookDtoFrom);
});

export const listPublishedEbooks = E.fn(function* () {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("ebooks")
    .index("by_status", (query) => query.eq("status", "published"))
    .collect()
    .pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbook = E.fn(function* ({ now, ...create }: WithNow<Ebooks["Create"]>) {
  const storageDoc = yield* getStorageDoc(create.storageId);

  if (O.isNone(storageDoc) || storageDoc.value.contentType !== "application/pdf" || storageDoc.value.size > MAX_SIZE)
    return { error: "INVALID_STORAGE_DOC" as const };

  const { _id: uploadedBy } = yield* CurrentAdmin;
  const writer = yield* DatabaseWriter;
  const latest = yield* getLatestEbook();

  const version = O.match(latest, { onNone: () => 1, onSome: (value) => value.version + 1 });
  const data = yield* writer
    .table("ebooks")
    .insert({ ...create, publishedAt: null, publishedBy: null, status: "draft", updatedAt: now, uploadedBy, version })
    .pipe(dieOnEncodeError);

  return { data };
});

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchEbook = E.fn(function* (id: Id<"ebooks">, patch: Partial<Ebooks["Fields"]>) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("ebooks").patch(id, patch).pipe(dieOnPatchError);
});

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markEbookArchived = E.fn(function* (id: Id<"ebooks">, { now }: WithNow) {
  return yield* patchEbook(id, { status: "archived", updatedAt: now });
});

export const markEbookPublished = E.fn(function* (id: Id<"ebooks">, { now, publishedBy }: MarkEbookPublishedOpts) {
  return yield* patchEbook(id, { publishedAt: now, publishedBy, status: "published", updatedAt: now });
});
type MarkEbookPublishedOpts = WithNow<{ publishedBy: Id<"profiles"> }>;
