import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zDocCommon } from "./utils";

// ENUMS -----------------------------------------------------------------------------------------------------------------------------------
export const zEbookIssuanceKind = z.literal(["initial", "replacement"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookIssuanceFields = z.object({
  ebookId: zid("ebooks"),
  kind: zEbookIssuanceKind,
  profileId: zid("profiles"),
});
export const zEbookIssuanceDoc = z.object({ ...zDocCommon("ebookIssuances").shape, ...zEbookIssuanceFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookIssuanceCreate = zEbookIssuanceFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookIssuances = {
  Create: z.infer<typeof zEbookIssuanceCreate>;
  Doc: z.infer<typeof zEbookIssuanceDoc>;
  Fields: z.infer<typeof zEbookIssuanceFields>;
};
