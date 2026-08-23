import type { Id } from "@ec/backend/types";
import type { EbookIssuances } from "@ec/domain/schemas/ebook-issuances";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError, optionById } from "./confect";
import { ebookDtoFrom, requireEbook } from "./ebooks";

// TRANSFORMS ------------------------------------------------------------------------------------------------------------------------------
export const ebookIssuanceDtoFrom = E.fn(function* (doc: EbookIssuances["Doc"]) {
  return { ...doc, ebook: yield* ebookDtoFrom(yield* requireEbook(doc.ebookId).pipe(E.orDie)) };
});

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbookIssuance = E.fn(function* (id: Id<"ebookIssuances">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("ebookIssuances").get(id).pipe(optionById);
});

export const getLatestEbookIssuance = E.fn(function* (profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("ebookIssuances")
    .index("by_profile_id", (q) => q.eq("profileId", profileId), "desc")
    .first()
    .pipe(dieOnDecodeError);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listEbookIssuancesNewestFirst = E.fn(function* (profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("ebookIssuances")
    .index("by_profile_id", (q) => q.eq("profileId", profileId), "desc")
    .collect()
    .pipe(dieOnDecodeError);
});

export const takeEbookIssuances = E.fn(function* (limit: number, profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("ebookIssuances")
    .index("by_profile_id", (q) => q.eq("profileId", profileId))
    .take(limit)
    .pipe(dieOnDecodeError);
});
// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookIssuance = E.fn(function* (payload: EbookIssuances["Create"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("ebookIssuances").insert(payload).pipe(dieOnEncodeError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteEbookIssuance = E.fn(function* (id: Id<"ebookIssuances">) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("ebookIssuances").delete(id);
});
