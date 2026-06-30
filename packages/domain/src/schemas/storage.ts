import z from "zod";

import { MAX_SIZE, PDF_ACCEPTED_TYPES } from "../helpers/storage";
import { zDocCommon } from "./utils";

// CONTENT_TYPES ---------------------------------------------------------------------------------------------------------------------------
export const zStorageContentTypePdf = z.literal(PDF_ACCEPTED_TYPES);
export const zStorageContentType = z.union([zStorageContentTypePdf]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zStorageFields = z.object({
  contentType: zStorageContentType,
  sha256: z.string(),
  size: z.int().nonnegative().max(MAX_SIZE),
});
export const zStorageDoc = z.object({ ...zDocCommon("_storage").shape, ...zStorageFields.shape });
export const zStoragePdfDoc = zStorageDoc.extend({ contentType: zStorageContentTypePdf });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Storage = {
  Doc: z.infer<typeof zStorageDoc>;
  Fields: z.infer<typeof zStorageFields>;
  PdfDoc: z.infer<typeof zStoragePdfDoc>;
};
