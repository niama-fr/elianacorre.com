import type { Id } from "@ec/backend/types";
import { TravelPackFailure } from "@ec/domain/errors/travel-packs";
import { ValidationFailure } from "@ec/domain/errors/utils";
import { slugify, suffixSlug } from "@ec/domain/helpers/slugs";
import { sStorageContentTypeImage, sStorageContentTypePdf } from "@ec/domain/schemas/storage";
import { sTravelPackDto, TRAVEL_PACK_ISSUE, type TravelPacks } from "@ec/domain/schemas/travel-packs";
import { VALIDATION_ISSUE } from "@ec/domain/schemas/utils";
import type { PaginationOptions } from "convex/server";
import { Effect as E, Option as O, Schema as S } from "effect";

import { getStorageDoc, getStorageUrl } from "../data/storage";
import { createTravelPack, getTravelPackBySlug, paginateTravelPacks, patchTravelPack, requireTravelPack } from "../data/travel-packs";
import { CurrentAdmin } from "../infra/current-profile";

// SLUG ------------------------------------------------------------------------------------------------------------------------------------
const resolveUniqueTravelPackSlug = E.fn(function* (value: string, currentId?: Id<"travelPacks">) {
  const base = slugify(value);
  if (base === "") return yield* new ValidationFailure({ code: VALIDATION_ISSUE.slugInvalid });
  let sequence = 1;

  while (true) {
    const candidate = suffixSlug(base, sequence);
    const existing = yield* getTravelPackBySlug(candidate);
    if (O.isNone(existing) || existing.value._id === currentId) return candidate;
    sequence += 1;
  }
});

// DTO -------------------------------------------------------------------------------------------------------------------------------------
export const travelPackDtoFrom = E.fn(function* (doc: TravelPacks["Doc"]) {
  const [coverUrl, pdf, pdfUrl] = yield* E.all(
    [
      doc.coverStorageId ? getStorageUrl(doc.coverStorageId) : E.succeed(O.none()),
      doc.pdfStorageId ? getStorageDoc(doc.pdfStorageId) : E.succeed(O.none()),
      doc.pdfStorageId ? getStorageUrl(doc.pdfStorageId) : E.succeed(O.none()),
    ],
    { concurrency: "unbounded" }
  );
  return yield* S.decodeEffect(sTravelPackDto)({
    ...doc,
    coverUrl: O.isSome(coverUrl) ? coverUrl.value.href : null,
    pdfSize: O.isSome(pdf) ? pdf.value.size : null,
    pdfUrl: O.isSome(pdfUrl) ? pdfUrl.value.href : null,
  }).pipe(E.orDie);
});

export const requireTravelPackDto = (id: Id<"travelPacks">) => E.flatMap(requireTravelPack(id), travelPackDtoFrom);

export const paginateTravelPackDtos = E.fn(function* (pagination: PaginationOptions) {
  const result = yield* paginateTravelPacks(pagination);
  const page = yield* E.forEach(result.page, travelPackDtoFrom, { concurrency: "unbounded" });
  return { ...result, page };
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createTravelPackDraft = E.fn(function* (title: string, now: number) {
  const profile = yield* CurrentAdmin;
  const slug = yield* resolveUniqueTravelPackSlug(title);

  return yield* createTravelPack({
    coverFileName: null,
    coverStorageId: null,
    createdBy: profile._id,
    description: "",
    destination: "",
    excerpt: "",
    pdfFileName: null,
    pdfStorageId: null,
    slug,
    status: "draft",
    title,
    updatedAt: now,
    updatedBy: profile._id,
    youtubeUrl: null,
  });
});

// UPDATE ----------------------------------------------------------------------------------------------------------------------------------
export const updateTravelPackDraft = E.fn(function* (opts: TravelPacks["Update"], now: number) {
  const profile = yield* CurrentAdmin;
  const { _id, ...payload } = opts;
  const current = yield* requireTravelPack(_id);

  if (current.status !== "draft") return yield* new TravelPackFailure({ code: TRAVEL_PACK_ISSUE.notEditable });
  if ((payload.coverFileName === null) !== (payload.coverStorageId === null))
    return yield* new TravelPackFailure({ code: TRAVEL_PACK_ISSUE.coverInvalid });
  if ((payload.pdfFileName === null) !== (payload.pdfStorageId === null))
    return yield* new TravelPackFailure({ code: TRAVEL_PACK_ISSUE.pdfInvalid });

  if (payload.coverStorageId) {
    const doc = yield* getStorageDoc(payload.coverStorageId);
    if (O.isNone(doc) || !doc.value.contentType || !S.is(sStorageContentTypeImage)(doc.value.contentType))
      return yield* new TravelPackFailure({ code: TRAVEL_PACK_ISSUE.coverInvalid });
  }

  if (payload.pdfStorageId) {
    const doc = yield* getStorageDoc(payload.pdfStorageId);
    if (O.isNone(doc) || !doc.value.contentType || !S.is(sStorageContentTypePdf)(doc.value.contentType))
      return yield* new TravelPackFailure({ code: TRAVEL_PACK_ISSUE.pdfInvalid });
  }

  const slug = yield* resolveUniqueTravelPackSlug(payload.slug, _id);
  yield* patchTravelPack(_id, { ...payload, slug, updatedAt: now, updatedBy: profile._id });
  return slug;
});

export const suggestTravelPackSlug = (title: string, currentId?: Id<"travelPacks">) => resolveUniqueTravelPackSlug(title, currentId);
