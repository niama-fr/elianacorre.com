import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zDocCommon } from "./utils";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookDownloadFields = z.object({
  ebookIssuanceId: zid("ebookIssuances"),
  expiresAt: z.number(),
});
export const zEbookDownloadDoc = z.object({ ...zDocCommon("ebookDownloads").shape, ...zEbookDownloadFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookDownloadCreate = zEbookDownloadFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookDownloads = {
  Create: z.infer<typeof zEbookDownloadCreate>;
  Doc: z.infer<typeof zEbookDownloadDoc>;
  Fields: z.infer<typeof zEbookDownloadFields>;
};
