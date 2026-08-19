/* oxlint-disable unicorn/throw-new-error -- Effect's S.TaggedError factory is not a thrown Error construction. */
import { GenericId, SystemFields } from "@confect/core";
import { Schema as S, SchemaGetter, Struct } from "effect";

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackStatus = S.Literals(["archived", "draft", "published"]);

// ERRORS ----------------------------------------------------------------------------------------------------------------------------------
export const TRAVEL_PACK_ERROR = {
  coverInvalid: "TRAVEL_PACK_COVER_INVALID",
  coverMimeTypeInvalid: "TRAVEL_PACK_COVER_MIME_TYPE_INVALID",
  coverSizeInvalid: "TRAVEL_PACK_COVER_SIZE_INVALID",
  notEditable: "TRAVEL_PACK_NOT_EDITABLE",
  pdfInvalid: "TRAVEL_PACK_PDF_INVALID",
  pdfMimeTypeInvalid: "TRAVEL_PACK_PDF_MIME_TYPE_INVALID",
  pdfSizeInvalid: "TRAVEL_PACK_PDF_SIZE_INVALID",
  slugInvalid: "TRAVEL_PACK_SLUG_INVALID",
  slugRequired: "TRAVEL_PACK_SLUG_REQUIRED",
  titleRequired: "TRAVEL_PACK_TITLE_REQUIRED",
  unknown: "TRAVEL_PACK_UNKNOWN",
  youtubeUrlInvalid: "TRAVEL_PACK_YOUTUBE_URL_INVALID",
} as const;

export const sTravelPackError = S.Literals(Object.values(TRAVEL_PACK_ERROR));
export const sTravelPackFailure = S.TaggedError<{
  readonly _tag: "TravelPackFailure";
  readonly code: typeof sTravelPackError.Type;
}>()("TravelPackFailure", { code: sTravelPackError });

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sTravelPackFileName = S.String.check(S.isMinLength(1));

export const sTravelPackDescription = S.String;
export const sTravelPackDestination = S.Trim;
export const sTravelPackExcerpt = S.Trim;
export const sTravelPackTitle = S.Trim.check(S.isMinLength(1, { message: TRAVEL_PACK_ERROR.titleRequired }));

const sTravelPackYoutubeUrlValue = S.String.check(
  S.makeFilter((value) => {
    try {
      const url = new URL(value);
      return (
        ((url.protocol === "http:" || url.protocol === "https:") &&
          (url.hostname === "youtube.com" || url.hostname === "www.youtube.com" || url.hostname === "youtu.be")) ||
        TRAVEL_PACK_ERROR.youtubeUrlInvalid
      );
    } catch {
      return TRAVEL_PACK_ERROR.youtubeUrlInvalid;
    }
  })
);

export const sTravelPackYoutubeUrl = S.Union([sTravelPackYoutubeUrlValue, S.Null]);

export const sTravelPackYoutubeUrlFromForm = S.String.pipe(
  S.decodeTo(sTravelPackYoutubeUrl, {
    decode: SchemaGetter.transform((value) => value.trim() || null),
    encode: SchemaGetter.transform((value) => value ?? ""),
  })
);

export const sTravelPackSlug = S.String.check(
  S.isMinLength(1, { message: TRAVEL_PACK_ERROR.slugRequired }),
  S.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, { message: TRAVEL_PACK_ERROR.slugInvalid })
);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const sStorageId = GenericId.GenericId("_storage");
const sProfileId = GenericId.GenericId("profiles");

export const sTravelPackFields = S.Struct({
  coverFileName: S.NullOr(sTravelPackFileName),
  coverStorageId: S.NullOr(sStorageId),
  createdBy: sProfileId,
  description: sTravelPackDescription,
  destination: sTravelPackDestination,
  excerpt: sTravelPackExcerpt,
  pdfFileName: S.NullOr(sTravelPackFileName),
  pdfStorageId: S.NullOr(sStorageId),
  slug: sTravelPackSlug,
  status: sTravelPackStatus,
  title: sTravelPackTitle,
  updatedAt: S.Finite,
  updatedBy: sProfileId,
  youtubeUrl: sTravelPackYoutubeUrl,
});
export const sTravelPackPatch = sTravelPackFields.mapFields(Struct.map(S.optionalKey));
export const sTravelPackDoc = sTravelPackFields.pipe(S.fieldsAssign(SystemFields.SystemFields("travelPacks").fields));

// DTO / ENTITY ---------------------------------------------------------------------------------------------------------------------------
export const sTravelPackDto = sTravelPackDoc.pipe(
  S.fieldsAssign({
    coverUrl: S.NullOr(S.String),
    pdfSize: S.NullOr(S.Natural),
    pdfUrl: S.NullOr(S.String),
  })
);

// Travel Packs currently have no hydrated representation beyond their serialized DTO.
export const sTravelPack = sTravelPackDto;

// CONTRACTS -------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackCreate = S.Struct({ title: sTravelPackTitle });
export const sTravelPackUpdate = S.Struct({
  _id: GenericId.GenericId("travelPacks"),
  coverFileName: S.NullOr(sTravelPackFileName),
  coverStorageId: S.NullOr(sStorageId),
  description: sTravelPackDescription,
  destination: sTravelPackDestination,
  excerpt: sTravelPackExcerpt,
  pdfFileName: S.NullOr(sTravelPackFileName),
  pdfStorageId: S.NullOr(sStorageId),
  slug: sTravelPackSlug,
  title: sTravelPackTitle,
  youtubeUrl: sTravelPackYoutubeUrl,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type TravelPacks = {
  Create: typeof sTravelPackCreate.Type;
  Doc: typeof sTravelPackDoc.Type;
  Dto: typeof sTravelPackDto.Type;
  Entity: typeof sTravelPack.Type;
  Error: typeof sTravelPackError.Type;
  Failure: typeof sTravelPackFailure.Type;
  Fields: typeof sTravelPackFields.Type;
  Status: typeof sTravelPackStatus.Type;
  Update: typeof sTravelPackUpdate.Type;
};
