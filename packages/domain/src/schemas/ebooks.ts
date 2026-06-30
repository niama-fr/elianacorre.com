import { PDF_ACCEPTED_TYPES, MAX_SIZE } from "@ec/domain/helpers/storage";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zDocCommon, zStorageRef } from "./utils";

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookStatus = z.literal(["archived", "draft", "published"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookFields = z.object({
  ...zStorageRef.shape,
  fileName: z.string(),
  publishedAt: z.nullable(z.number()),
  publishedBy: z.nullable(zid("profiles")),
  status: zEbookStatus,
  title: z.string(),
  updatedAt: z.number(),
  uploadedBy: zid("profiles"),
  version: z.number(),
});
export const zEbookDoc = z.object({ ...zDocCommon("ebooks").shape, ...zEbookFields.shape });

export const zEbookEntry = z.object({
  ...zEbookDoc.omit({ storageId: true }).shape,
  size: z.int().nonnegative().nullable(),
  url: z.url().nullable(),
});

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zEbook = zEbookEntry;

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookCreateValues = z.object({
  file: z
    .file({ error: "L'ebook est requis" })
    .max(MAX_SIZE, { error: "Le fichier PDF doit avoir une taille maximale de 20 Mo" })
    .mime([...PDF_ACCEPTED_TYPES], { error: "Veuillez sélectionner un fichier PDF" })
    .nullable()
    .refine((file) => file !== null, { error: "L'ebook est requis" }),
  title: z.string().trim().min(1, { error: "Le titre est requis" }),
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookCreate = zEbookFields.pick({ fileName: true, storageId: true, title: true });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Ebooks = {
  Create: z.infer<typeof zEbookCreate>;
  CreateDefaultValues: z.input<typeof zEbookCreateValues>;
  CreateValues: z.infer<typeof zEbookCreateValues>;
  Doc: z.infer<typeof zEbookDoc>;
  Entity: z.infer<typeof zEbook>;
  Fields: z.infer<typeof zEbookFields>;
  Status: z.infer<typeof zEbookStatus>;
};
