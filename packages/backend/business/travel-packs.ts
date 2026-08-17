import type { AuthenticatedMutationCtx } from "@ec/backend/convex/zod";
import type { QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { slugify, suffixSlug } from "@ec/domain/helpers/slugs";
import { zStorageImageDoc, zStoragePdfDoc } from "@ec/domain/schemas/storage";
import { TRAVEL_PACK_ERROR, type TravelPacks } from "@ec/domain/schemas/travel-packs";
import type { WithNow } from "@ec/domain/schemas/utils";
import type { PaginationOptions } from "convex/server";
import { ConvexError } from "convex/values";

import { getStorageDoc, getStorageUrl } from "../data/storage";
import { createTravelPack, getTravelPackBySlug, paginateTravelPacks, patchTravelPack, requireTravelPack } from "../data/travel-packs";

// DTO -------------------------------------------------------------------------------------------------------------------------------------
export async function travelPackDtoFrom(ctx: QueryCtx, doc: TravelPacks["Doc"]): Promise<TravelPacks["Dto"]> {
  const [coverUrl, pdf, pdfUrl] = await Promise.all([
    doc.coverStorageId ? getStorageUrl(ctx, doc.coverStorageId) : null,
    doc.pdfStorageId ? getStorageDoc(ctx, doc.pdfStorageId) : null,
    doc.pdfStorageId ? getStorageUrl(ctx, doc.pdfStorageId) : null,
  ]);
  return { ...doc, coverUrl, pdfSize: pdf?.size ?? null, pdfUrl };
}

export async function requireTravelPackDto(ctx: QueryCtx, id: Id<"travelPacks">) {
  return await travelPackDtoFrom(ctx, await requireTravelPack(ctx, id));
}

export async function paginateTravelPackDtos(ctx: QueryCtx, pagination: PaginationOptions) {
  const result = await paginateTravelPacks(ctx, pagination);
  return { ...result, page: await Promise.all(result.page.map(async (doc) => await travelPackDtoFrom(ctx, doc))) };
}

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export async function createTravelPackDraft(ctx: AuthenticatedMutationCtx, { now, ...create }: WithNow<TravelPacks["Create"]>) {
  const slug = await resolveUniqueTravelPackSlug(ctx, create.title);

  return await createTravelPack(ctx, {
    ...create,
    coverFileName: null,
    coverStorageId: null,
    createdBy: ctx.profile._id,
    description: "",
    destination: "",
    excerpt: "",
    pdfFileName: null,
    pdfStorageId: null,
    slug,
    status: "draft",
    updatedAt: now,
    updatedBy: ctx.profile._id,
    youtubeUrl: null,
  });
}

// SUGGEST SLUG ----------------------------------------------------------------------------------------------------------------------------
export async function suggestTravelPackSlug(ctx: QueryCtx, title: string, currentId?: Id<"travelPacks">) {
  return await resolveUniqueTravelPackSlug(ctx, title, currentId);
}

// UPDATE ----------------------------------------------------------------------------------------------------------------------------------
export async function updateTravelPackDraft(ctx: AuthenticatedMutationCtx, opts: WithNow<TravelPacks["Update"]>) {
  const { now, _id, ...payload } = opts;
  const current = await requireTravelPack(ctx, _id);

  if (current.status !== "draft") throw new ConvexError(TRAVEL_PACK_ERROR.notEditable);

  if (payload.coverStorageId) {
    const doc = await getStorageDoc(ctx, payload.coverStorageId);
    if (!zStorageImageDoc.safeParse(doc).success) throw new ConvexError(TRAVEL_PACK_ERROR.coverInvalid);
  }

  if (payload.pdfStorageId) {
    const doc = await getStorageDoc(ctx, payload.pdfStorageId);
    if (!zStoragePdfDoc.safeParse(doc).success) throw new ConvexError(TRAVEL_PACK_ERROR.pdfInvalid);
  }

  const slug = await resolveUniqueTravelPackSlug(ctx, payload.slug, _id);

  await patchTravelPack(ctx, _id, { ...payload, slug, updatedAt: now, updatedBy: ctx.profile._id });

  return slug;
}

// INTERNAL -------------------------------------------------------------------------------------------------------------------------------
async function resolveUniqueTravelPackSlug(ctx: QueryCtx, value: string, currentId?: Id<"travelPacks">) {
  const base = slugify(value);
  if (base === "") throw new ConvexError(TRAVEL_PACK_ERROR.slugInvalid);
  let sequence = 1;

  while (true) {
    const candidate = suffixSlug(base, sequence);
    const existing = await getTravelPackBySlug(ctx, candidate);

    if (!existing || existing._id === currentId) return candidate;

    sequence += 1;
  }
}
