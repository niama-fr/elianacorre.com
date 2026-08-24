import type { Id } from "@ec/backend/types";
import type { NewsRestrictions } from "@ec/domain/schemas/news-restrictions";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnPatchError, dieOnDecodeError, dieOnEncodeError, optionById, optionByIndex } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsRestriction = E.fn(function* (id: Id<"newsRestrictions">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("newsRestrictions").get(id).pipe(optionById);
});

export const getActiveNewsRestriction = E.fn(function* (profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("newsRestrictions").get("by_profile_id_and_resolved_at", profileId, null).pipe(optionByIndex);
});

export const getLatestNewsRestriction = E.fn(function* (profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("newsRestrictions")
    .index("by_profile_id_and_restricted_at", (q) => q.eq("profileId", profileId), "desc")
    .first()
    .pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createProviderNewsRestriction = E.fn(function* (payload: NewsRestrictions["Create"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer
    .table("newsRestrictions")
    .insert({
      ...payload,
      resolvedAt: null,
      resolvedBy: null,
      restrictedAt: payload.lastOccurredAt,
      restrictedBy: "provider",
      version: 1,
    })
    .pipe(dieOnEncodeError);
});

// PATCH ----------------------------------------------------------------------------------------------------------------------------------
export const patchNewsRestriction = E.fn(function* (id: Id<"newsRestrictions">, patch: NewsRestrictions["Patch"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("newsRestrictions").patch(id, patch).pipe(dieOnPatchError);
});
