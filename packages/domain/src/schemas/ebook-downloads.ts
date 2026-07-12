import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookDownloadFields = z.object({
  ebookIssuanceId: zid("ebookIssuances"),
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
