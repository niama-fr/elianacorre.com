import type { Id } from "@ec/backend/types";
import type { EbookDownloads } from "@ec/domain/schemas/ebook-downloads";
import type { PaginationOptions } from "convex/server";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError, optionById } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbookDownload = E.fn(function* (id: Id<"ebookDownloads">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("ebookDownloads").get(id).pipe(optionById);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateExpiredEbookDownloads = E.fn(function* (pagination: PaginationOptions, before: number) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("ebookDownloads")
    .index("by_creation_time", (q) => q.lte("_creationTime", before))
    .paginate(pagination)
    .pipe(dieOnDecodeError);
});

export const takeEbookIssuanceDownloads = E.fn(function* (limit: number, ebookIssuanceId: Id<"ebookIssuances">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("ebookDownloads")
    .index("by_ebook_issuance_id", (q) => q.eq("ebookIssuanceId", ebookIssuanceId))
    .take(limit)
    .pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookDownload = E.fn(function* (create: EbookDownloads["Create"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("ebookDownloads").insert(create).pipe(dieOnEncodeError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteEbookDownload = E.fn(function* (id: Id<"ebookDownloads">) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("ebookDownloads").delete(id);
});
