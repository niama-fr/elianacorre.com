import type { Id } from "@ec/backend/types";
import { TravelPackNotFound } from "@ec/domain/errors/travel-packs";
import type { TravelPacks } from "@ec/domain/schemas/travel-packs";
import type { PaginationOptions } from "convex/server";
import { Effect as E, Option as O } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnPatchError, dieOnDecodeError, dieOnEncodeError, optionById, optionByIndex } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getTravelPack = E.fn(function* (id: Id<"travelPacks">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("travelPacks").get(id).pipe(optionById);
});

export const getTravelPackBySlug = E.fn(function* (slug: string) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("travelPacks").get("by_slug", slug).pipe(optionByIndex);
});

export const getTravelPackByCoverStorageId = E.fn(function* (storageId: Id<"_storage">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("travelPacks").get("by_cover_storage_id", storageId).pipe(optionByIndex);
});

export const getTravelPackByPdfStorageId = E.fn(function* (storageId: Id<"_storage">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("travelPacks").get("by_pdf_storage_id", storageId).pipe(optionByIndex);
});

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireTravelPack = E.fn(function* (id: Id<"travelPacks">) {
  return yield* O.match(yield* getTravelPack(id), {
    onNone: () => new TravelPackNotFound(),
    onSome: E.succeed,
  });
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateTravelPacks = E.fn(function* (pagination: PaginationOptions) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("travelPacks").index("by_updated_at", "desc").paginate(pagination).pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createTravelPack = E.fn(function* (fields: TravelPacks["Fields"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("travelPacks").insert(fields).pipe(dieOnEncodeError);
});

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchTravelPack = E.fn(function* (id: Id<"travelPacks">, patch: TravelPacks["Patch"]) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("travelPacks").patch(id, patch).pipe(dieOnPatchError);
});
