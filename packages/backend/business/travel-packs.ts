import type { Id } from "@ec/backend/types";
import { slugify, suffixSlug } from "@ec/domain/helpers/slugs";
import { sStorageContentTypeImage, sStorageContentTypePdf } from "@ec/domain/schemas/storage";
import { sTravelPackDto, sTravelPackFailure, TRAVEL_PACK_ERROR, type TravelPacks } from "@ec/domain/schemas/travel-packs";
import type { PaginationOptions } from "convex/server";
import { Effect as E, Option, Schema as S } from "effect";

import { findStorageDoc, findStorageUrl } from "../data/storage";
import { findTravelPack, findTravelPackBySlug, findTravelPacksPage, insertTravelPack, updateTravelPackFields } from "../data/travel-packs";
import { CurrentAdmin } from "../runtime/current-profile";

const fail = (code: TravelPacks["Error"]) => new sTravelPackFailure({ code });

const requireTravelPack = E.fn("requireTravelPack")(function* (id: Id<"travelPacks">) {
  const doc = yield* findTravelPack(id);
  if (Option.isNone(doc)) return yield* fail(TRAVEL_PACK_ERROR.unknown);
  return doc.value;
});

const resolveUniqueTravelPackSlug = E.fn("resolveUniqueTravelPackSlug")(function* (value: string, currentId?: Id<"travelPacks">) {
  const base = slugify(value);
  if (base === "") return yield* fail(TRAVEL_PACK_ERROR.slugInvalid);
  let sequence = 1;

  while (true) {
    const candidate = suffixSlug(base, sequence);
    const existing = yield* findTravelPackBySlug(candidate);
    if (Option.isNone(existing) || existing.value._id === currentId) return candidate;
    sequence += 1;
  }
});

// DTO -------------------------------------------------------------------------------------------------------------------------------------
export const travelPackDtoFrom = E.fn("travelPackDtoFrom")(function* (doc: TravelPacks["Doc"]) {
  const [coverUrl, pdf, pdfUrl] = yield* E.all(
    [
      doc.coverStorageId ? findStorageUrl(doc.coverStorageId) : E.succeed(null),
      doc.pdfStorageId ? findStorageDoc(doc.pdfStorageId) : E.succeed(null),
      doc.pdfStorageId ? findStorageUrl(doc.pdfStorageId) : E.succeed(null),
    ],
    { concurrency: "unbounded" }
  );
  return yield* S.decodeEffect(sTravelPackDto)({ ...doc, coverUrl, pdfSize: pdf?.size ?? null, pdfUrl }).pipe(E.orDie);
});

export const requireTravelPackDto = (id: Id<"travelPacks">) => E.flatMap(requireTravelPack(id), travelPackDtoFrom);

export const paginateTravelPackDtos = E.fn("paginateTravelPackDtos")(function* (pagination: PaginationOptions) {
  const result = yield* findTravelPacksPage(pagination);
  const page = yield* E.forEach(result.page, travelPackDtoFrom, { concurrency: "unbounded" });
  return { ...result, page };
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createTravelPackDraft = E.fn("createTravelPackDraft")(function* (title: string, now: number) {
  const profile = yield* CurrentAdmin;
  const slug = yield* resolveUniqueTravelPackSlug(title);

  return yield* insertTravelPack({
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
export const updateTravelPackDraft = E.fn("updateTravelPackDraft")(function* (opts: TravelPacks["Update"], now: number) {
  const profile = yield* CurrentAdmin;
  const { _id, ...payload } = opts;
  const current = yield* requireTravelPack(_id);

  if (current.status !== "draft") return yield* fail(TRAVEL_PACK_ERROR.notEditable);
  if ((payload.coverFileName === null) !== (payload.coverStorageId === null)) return yield* fail(TRAVEL_PACK_ERROR.coverInvalid);
  if ((payload.pdfFileName === null) !== (payload.pdfStorageId === null)) return yield* fail(TRAVEL_PACK_ERROR.pdfInvalid);

  if (payload.coverStorageId) {
    const doc = yield* findStorageDoc(payload.coverStorageId);
    if (!doc?.contentType || !S.is(sStorageContentTypeImage)(doc.contentType)) return yield* fail(TRAVEL_PACK_ERROR.coverInvalid);
  }

  if (payload.pdfStorageId) {
    const doc = yield* findStorageDoc(payload.pdfStorageId);
    if (!doc?.contentType || !S.is(sStorageContentTypePdf)(doc.contentType)) return yield* fail(TRAVEL_PACK_ERROR.pdfInvalid);
  }

  const slug = yield* resolveUniqueTravelPackSlug(payload.slug, _id);
  yield* updateTravelPackFields(_id, { ...payload, slug, updatedAt: now, updatedBy: profile._id });
  return slug;
});

export const suggestTravelPackSlug = (title: string, currentId?: Id<"travelPacks">) => resolveUniqueTravelPackSlug(title, currentId);
