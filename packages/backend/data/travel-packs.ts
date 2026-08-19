import type { AuthenticatedMutationCtx } from "@ec/backend/convex/zod";
import type { QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { TRAVEL_PACK_ERROR, type TravelPacks } from "@ec/domain/schemas/travel-packs";
import type { PaginationOptions } from "convex/server";
import { ConvexError } from "convex/values";
import { Effect as E } from "effect";

import { db } from "../runtime/database";

// EFFECT GET ------------------------------------------------------------------------------------------------------------------------------
export const findTravelPack = E.fn(function* (id: Id<"travelPacks">) {
  const reader = yield* db.Reader;
  return yield* reader.get("travelPacks", id);
});

export const findTravelPackBySlug = E.fn(function* (slug: string) {
  const reader = yield* db.Reader;
  return yield* reader
    .query("travelPacks")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
});

export const findTravelPacksPage = E.fn(function* (pagination: PaginationOptions) {
  const reader = yield* db.Reader;
  return yield* reader.query("travelPacks").withIndex("by_updated_at").order("desc").paginate(pagination);
});

// EFFECT WRITE ----------------------------------------------------------------------------------------------------------------------------
export const insertTravelPack = E.fn(function* (fields: TravelPacks["Fields"]) {
  const writer = yield* db.Writer;
  return yield* writer.insert("travelPacks", fields);
});

export const updateTravelPackFields = E.fn(function* (id: Id<"travelPacks">, patch: Partial<TravelPacks["Fields"]>) {
  const writer = yield* db.Writer;
  yield* writer.patch("travelPacks", id, patch);
});

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getTravelPack = async (ctx: QueryCtx, id: Id<"travelPacks">) => await ctx.db.get("travelPacks", id);

export const getTravelPackByCoverStorageId = async (ctx: QueryCtx, storageId: Id<"_storage">) =>
  await ctx.db
    .query("travelPacks")
    .withIndex("by_cover_storage_id", (q) => q.eq("coverStorageId", storageId))
    .first();

export const getTravelPackByPdfStorageId = async (ctx: QueryCtx, storageId: Id<"_storage">) =>
  await ctx.db
    .query("travelPacks")
    .withIndex("by_pdf_storage_id", (q) => q.eq("pdfStorageId", storageId))
    .first();

export const getTravelPackBySlug = async (ctx: QueryCtx, slug: string) =>
  await ctx.db
    .query("travelPacks")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

export const requireTravelPack = async (ctx: QueryCtx, id: Id<"travelPacks">) => {
  const doc = await getTravelPack(ctx, id);
  if (!doc) throw new ConvexError(TRAVEL_PACK_ERROR.unknown);
  return doc;
};

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateTravelPacks = async (ctx: QueryCtx, pagination: PaginationOptions) =>
  await ctx.db.query("travelPacks").withIndex("by_updated_at").order("desc").paginate(pagination);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createTravelPack = async (ctx: AuthenticatedMutationCtx, fields: TravelPacks["Fields"]) =>
  await ctx.db.insert("travelPacks", fields);

// PATCH -----------------------------------------------------------------------------------------------------------------------------------

export const patchTravelPack = async (ctx: AuthenticatedMutationCtx, id: Id<"travelPacks">, patch: Partial<TravelPacks["Fields"]>) => {
  await ctx.db.patch("travelPacks", id, patch);
};
