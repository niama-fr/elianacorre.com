import { slugify } from "@ec/domain/helpers/slugs";
import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zTravelPackStatus = z.literal(["archived", "draft", "published"]);

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const zTravelPackFileName = z.string().trim().min(1);

export const zTravelPackDescription = z.string();
export const zTravelPackDestination = z.string().trim();
export const zTravelPackExcerpt = z.string().trim();
export const zTravelPackTitle = z.string().trim().min(1, { error: "TRAVEL_PACK_TITLE_REQUIRED" });

export const zTravelPackYoutubeUrl = z
  .url({
    error: "TRAVEL_PACK_YOUTUBE_URL_INVALID",
    hostname: /^(?:www\.)?(?:youtube\.com|youtu\.be)$/u,
    protocol: /^https?$/u,
  })
  .nullable();

export const zTravelPackSlug = z
  .string()
  .min(1, { error: "TRAVEL_PACK_SLUG_REQUIRED" })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, { error: "TRAVEL_PACK_SLUG_INVALID" });

export const zTravelPackSlugInput = z.string().transform(slugify).pipe(zTravelPackSlug);

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
const zTravelPackCover = z.object({ coverFileName: zTravelPackFileName, coverStorageId: zid("_storage") });
const zTravelPackPdf = z.object({ pdfFileName: zTravelPackFileName, pdfStorageId: zid("_storage") });

export const zTravelPackCreate = zTravelPackFields.pick({ title: true });

export const zTravelPackUpdate = zTravelPackFields
  .pick({ description: true, destination: true, excerpt: true, title: true, youtubeUrl: true })
  .extend({ cover: zTravelPackCover.nullable(), pdf: zTravelPackPdf.nullable(), slug: zTravelPackSlugInput });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type TravelPacks = {
  Create: z.infer<typeof zTravelPackCreate>;
  Doc: z.infer<typeof zTravelPackDoc>;
  Dto: z.infer<typeof zTravelPackDto>;
  Entity: z.infer<typeof zTravelPack>;
  Fields: z.infer<typeof zTravelPackFields>;
  Status: z.infer<typeof zTravelPackStatus>;
  Update: z.infer<typeof zTravelPackUpdate>;
};
