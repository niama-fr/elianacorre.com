import type { AuthenticatedMutationCtx } from "@ec/backend/convex/zod";
import type { QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { slugify, suffixSlug } from "@ec/domain/helpers/slugs";
import { zStorageImageDoc, zStoragePdfDoc } from "@ec/domain/schemas/storage";
import type { TravelPacks } from "@ec/domain/schemas/travel-packs";
import type { WithNow } from "@ec/domain/schemas/utils";
import { ConvexError } from "convex/values";

import { deleteStorage, getStorageDoc, getStorageUrl } from "../data/storage";
import { getTravelPackBySlug, createTravelPack, patchTravelPack, requireTravelPack, takeTravelPacks } from "../data/travel-packs";

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

export async function takeTravelPackDtos(ctx: QueryCtx, limit: number) {
  const docs = await takeTravelPacks(ctx, limit);
  return await Promise.all(docs.map(async (doc) => await travelPackDtoFrom(ctx, doc)));
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
export async function updateTravelPackDraft(
  ctx: AuthenticatedMutationCtx,
  id: Id<"travelPacks">,
  { cover, now, pdf, ...metadata }: WithNow<TravelPacks["Update"]>
) {
  const current = await requireTravelPack(ctx, id);

  if (current.status !== "draft") throw new ConvexError("TRAVEL_PACK_NOT_EDITABLE");

  const slug = requireValidSlug(metadata.slug);
  const existing = await getTravelPackBySlug(ctx, slug);

  if (existing && existing._id !== id) throw new ConvexError("TRAVEL_PACK_SLUG_TAKEN");

  if (cover) {
    const doc = await getStorageDoc(ctx, cover.coverStorageId);
    if (!zStorageImageDoc.safeParse(doc).success) throw new ConvexError("INVALID_TRAVEL_PACK_COVER");
  }

  if (pdf) {
    const doc = await getStorageDoc(ctx, pdf.pdfStorageId);
    if (!zStoragePdfDoc.safeParse(doc).success) throw new ConvexError("INVALID_TRAVEL_PACK_PDF");
  }

  await patchTravelPack(ctx, id, {
    ...metadata,
    ...cover,
    ...pdf,
    slug,
    updatedAt: now,
    updatedBy: ctx.profile._id,
  });

  if (cover && current.coverStorageId && current.coverStorageId !== cover.coverStorageId) await deleteStorage(ctx, current.coverStorageId);

  if (pdf && current.pdfStorageId && current.pdfStorageId !== pdf.pdfStorageId) await deleteStorage(ctx, current.pdfStorageId);
}

// INTERNAL -------------------------------------------------------------------------------------------------------------------------------
function requireValidSlug(value: string) {
  const slug = slugify(value);

  if (!slug) throw new ConvexError("INVALID_TRAVEL_PACK_SLUG");

  return slug;
}

async function resolveUniqueTravelPackSlug(ctx: QueryCtx, value: string, currentId?: Id<"travelPacks">) {
  const base = requireValidSlug(value);
  let sequence = 1;

  while (true) {
    const candidate = suffixSlug(base, sequence);
    const existing = await getTravelPackBySlug(ctx, candidate);

    if (!existing || existing._id === currentId) return candidate;

    sequence += 1;
  }
}
