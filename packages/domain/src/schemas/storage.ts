import z from "zod";

import { IMAGE_ACCEPTED_TYPES, MAX_SIZE, PDF_ACCEPTED_TYPES } from "../helpers/storage";
import { zDocCommon } from "./utils";

// CONTENT TYPES ---------------------------------------------------------------------------------------------------------------------------
export const zStorageContentTypePdf = z.literal(PDF_ACCEPTED_TYPES);
export const zStorageContentTypeImage = z.literal(IMAGE_ACCEPTED_TYPES);
export const zStorageContentType = z.literal([...PDF_ACCEPTED_TYPES, ...IMAGE_ACCEPTED_TYPES]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zStorageFields = z.object({
  contentType: zStorageContentType,
  sha256: z.string(),
  size: z.int().nonnegative().max(MAX_SIZE),
});
export const zStorageDoc = z.object({ ...zDocCommon("_storage").shape, ...zStorageFields.shape });
export const zStoragePdfDoc = z.object({ ...zStorageDoc.shape, contentType: zStorageContentTypePdf });
export const zStorageImageDoc = z.object({ ...zStorageDoc.shape, contentType: zStorageContentTypeImage });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Storage = {
  Doc: z.infer<typeof zStorageDoc>;
  Fields: z.infer<typeof zStorageFields>;
};
