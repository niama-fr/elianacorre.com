/* oxlint-disable unicorn/throw-new-error -- Effect's S.TaggedError factory is not a thrown Error construction. */
import { GenericId, SystemFields } from "@confect/core";
import { Schema as S, SchemaGetter as SG, Struct } from "effect";

import { sSlug, sTrimRequired } from "./utils";

// ISSUES ----------------------------------------------------------------------------------------------------------------------------------
export const TRAVEL_PACK_ISSUE = {
  coverInvalid: "TRAVEL_PACK_COVER_INVALID",
  coverMimeTypeInvalid: "TRAVEL_PACK_COVER_MIME_TYPE_INVALID",
  coverSizeInvalid: "TRAVEL_PACK_COVER_SIZE_INVALID",
  notEditable: "TRAVEL_PACK_NOT_EDITABLE",
  pdfInvalid: "TRAVEL_PACK_PDF_INVALID",
  pdfMimeTypeInvalid: "TRAVEL_PACK_PDF_MIME_TYPE_INVALID",
  pdfSizeInvalid: "TRAVEL_PACK_PDF_SIZE_INVALID",
  unknown: "TRAVEL_PACK_UNKNOWN",
  youtubeUrlInvalid: "TRAVEL_PACK_YOUTUBE_URL_INVALID",
} as const;
export const sTravelPackIssue = S.Literals(Object.values(TRAVEL_PACK_ISSUE));

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackStatus = S.Literals(["archived", "draft", "published"]);

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sTravelPackYoutubeUrlValue = S.String.check(
  S.makeFilter((value) => {
    try {
      const url = new URL(value);
      return (
        ((url.protocol === "http:" || url.protocol === "https:") &&
          (url.hostname === "youtube.com" || url.hostname === "www.youtube.com" || url.hostname === "youtu.be")) ||
        TRAVEL_PACK_ISSUE.youtubeUrlInvalid
      );
    } catch {
      return TRAVEL_PACK_ISSUE.youtubeUrlInvalid;
    }
  })
);

export const sTravelPackYoutubeUrl = S.Union([sTravelPackYoutubeUrlValue, S.Null]);

export const sTravelPackYoutubeUrlFromForm = S.String.pipe(
  S.decodeTo(sTravelPackYoutubeUrl, {
    decode: SG.transform((value) => value.trim() || null),
    encode: SG.transform((value) => value ?? ""),
  })
);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const sStorageId = GenericId.GenericId("_storage");
const sProfileId = GenericId.GenericId("profiles");

export const sTravelPackFields = S.Struct({
  coverFileName: S.NullOr(sTrimRequired),
  coverStorageId: S.NullOr(sStorageId),
  createdBy: sProfileId,
  description: S.String,
  destination: S.Trim,
  excerpt: S.Trim,
  pdfFileName: S.NullOr(sTrimRequired),
  pdfStorageId: S.NullOr(sStorageId),
  slug: sSlug,
  status: sTravelPackStatus,
  title: sTrimRequired,
  updatedAt: S.Finite,
  updatedBy: sProfileId,
  youtubeUrl: sTravelPackYoutubeUrl,
});
export const sTravelPackDoc = sTravelPackFields.pipe(S.fieldsAssign(SystemFields.SystemFields("travelPacks").fields));

// DTO / ENTITY ---------------------------------------------------------------------------------------------------------------------------
export const sTravelPackDto = sTravelPackDoc.pipe(
  S.fieldsAssign({
    coverUrl: S.NullOr(S.String),
    pdfSize: S.NullOr(S.Natural),
    pdfUrl: S.NullOr(S.String),
  })
);

export const sTravelPack = sTravelPackDto;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackCreate = sTravelPackFields.mapFields(Struct.pick(["title"]));

// UPDATE ----------------------------------------------------------------------------------------------------------------------------------
export const sTravelPackPatch = sTravelPackFields.mapFields(Struct.omit(["createdBy", "status"])).mapFields(Struct.map(S.optionalKey));
export const sTravelPackUpdate = sTravelPackDoc.mapFields(Struct.omit(["_creationTime", "createdBy", "status", "updatedAt", "updatedBy"]));

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type TravelPacks = {
  Create: typeof sTravelPackCreate.Type;
  Doc: typeof sTravelPackDoc.Type;
  Dto: typeof sTravelPackDto.Type;
  Entity: typeof sTravelPack.Type;
  Fields: typeof sTravelPackFields.Type;
  Issue: typeof sTravelPackIssue.Type;
  Patch: typeof sTravelPackPatch.Type;
  Status: typeof sTravelPackStatus.Type;
  Update: typeof sTravelPackUpdate.Type;
};
