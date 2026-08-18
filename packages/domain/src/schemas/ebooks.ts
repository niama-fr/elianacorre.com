import { zDocCommon, zStorageRef } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookStatus = z.literal(["archived", "draft", "published"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookFields = z.object({
  ...zStorageRef.shape,
  fileName: z.string(),
  publishedAt: z.nullable(z.number()),
  publishedBy: z.nullable(zid("profiles")),
  status: zEbookStatus,
  title: z.string().trim().min(1),
  updatedAt: z.number(),
  uploadedBy: zid("profiles"),
  version: z.number(),
});
export const zEbookDoc = z.object({ ...zDocCommon("ebooks").shape, ...zEbookFields.shape });

// DTO -------------------------------------------------------------------------------------------------------------------------------------
export const zEbookDto = z.object({
  ...zEbookDoc.omit({ storageId: true }).shape,
  size: z.int().nonnegative().nullable(),
  url: z.url().nullable(),
});

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zEbook = zEbookDto;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookCreate = zEbookFields.pick({ fileName: true, storageId: true, title: true });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Ebooks = {
  Create: z.infer<typeof zEbookCreate>;
  Doc: z.infer<typeof zEbookDoc>;
  Dto: z.infer<typeof zEbookDto>;
  Entity: z.infer<typeof zEbook>;
  Fields: z.infer<typeof zEbookFields>;
  Status: z.infer<typeof zEbookStatus>;
};
