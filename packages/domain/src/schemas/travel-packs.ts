import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackStatus = z.literal(["archived", "draft", "published"]);

// ERRORS ----------------------------------------------------------------------------------------------------------------------------------
export const TRAVEL_PACK_ERROR = {
  coverInvalid: "TRAVEL_PACK_COVER_INVALID",
  createFailed: "TRAVEL_PACK_CREATE_FAILED",
  notEditable: "TRAVEL_PACK_NOT_EDITABLE",
  pdfInvalid: "TRAVEL_PACK_PDF_INVALID",
  slugInvalid: "TRAVEL_PACK_SLUG_INVALID",
  slugRequired: "TRAVEL_PACK_SLUG_REQUIRED",
  slugTaken: "TRAVEL_PACK_SLUG_TAKEN",
  titleRequired: "TRAVEL_PACK_TITLE_REQUIRED",
  unknown: "TRAVEL_PACK_UNKNOWN",
  updateInvalid: "TRAVEL_PACK_UPDATE_INVALID",
  youtubeUrlInvalid: "TRAVEL_PACK_YOUTUBE_URL_INVALID",
} as const;

export const zTravelPackError = z.enum(TRAVEL_PACK_ERROR);

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const zTravelPackFileName = z.string().min(1);

export const zTravelPackDescription = z.string();
export const zTravelPackDestination = z.string().trim();
export const zTravelPackExcerpt = z.string().trim();
export const zTravelPackTitle = z.string().trim().min(1, { error: TRAVEL_PACK_ERROR.titleRequired });

export const zTravelPackYoutubeUrl = z
  .url({
    error: TRAVEL_PACK_ERROR.youtubeUrlInvalid,
    hostname: /^(?:www\.)?(?:youtube\.com|youtu\.be)$/u,
    protocol: /^https?$/u,
  })
  .nullable();

export const zTravelPackSlug = z
  .string()
  .min(1, { error: TRAVEL_PACK_ERROR.slugRequired })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, { error: TRAVEL_PACK_ERROR.slugInvalid });

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackFields = z.object({
  coverFileName: zTravelPackFileName.nullable(),
  coverStorageId: zid("_storage").nullable(),
  createdBy: zid("profiles"),
  description: zTravelPackDescription,
  destination: zTravelPackDestination,
  excerpt: zTravelPackExcerpt,
  pdfFileName: zTravelPackFileName.nullable(),
  pdfStorageId: zid("_storage").nullable(),
  slug: zTravelPackSlug,
  status: zTravelPackStatus,
  title: zTravelPackTitle,
  updatedAt: z.number(),
  updatedBy: zid("profiles"),
  youtubeUrl: zTravelPackYoutubeUrl,
});
export const zTravelPackDoc = z.object({ ...zDocCommon("travelPacks").shape, ...zTravelPackFields.shape });

// DTO -------------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackDto = z.object({
  ...zTravelPackDoc.shape,
  coverUrl: z.url().nullable(),
  pdfSize: z.int().nonnegative().nullable(),
  pdfUrl: z.url().nullable(),
});

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPack = zTravelPackDto;

// PAYLOADS --------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackCreate = zTravelPackFields.pick({ title: true });

export const zTravelPackUpdate = zTravelPackDoc.omit({
  _creationTime: true,
  createdBy: true,
  status: true,
  updatedAt: true,
  updatedBy: true,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type TravelPacks = {
  Create: z.infer<typeof zTravelPackCreate>;
  Doc: z.infer<typeof zTravelPackDoc>;
  Dto: z.infer<typeof zTravelPackDto>;
  Entity: z.infer<typeof zTravelPack>;
  Error: z.infer<typeof zTravelPackError>;
  Fields: z.infer<typeof zTravelPackFields>;
  Status: z.infer<typeof zTravelPackStatus>;
  Update: z.infer<typeof zTravelPackUpdate>;
};
