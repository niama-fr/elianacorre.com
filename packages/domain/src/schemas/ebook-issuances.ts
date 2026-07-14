import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zEbookEntry } from "./ebooks";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["initial", "replacement"] as const;
export const zEbookIssuanceKind = z.literal(kinds);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookIssuanceFields = z.object({
  ebookId: zid("ebooks"),
  kind: zEbookIssuanceKind,
  profileId: zid("profiles"),
});
export const zEbookIssuanceDoc = z.object({ ...zDocCommon("ebookIssuances").shape, ...zEbookIssuanceFields.shape });

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookIssuanceEntry = z.object({ ...zEbookIssuanceDoc.shape, ebook: zEbookEntry });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookIssuanceCreate = zEbookIssuanceFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookIssuances = {
  Create: z.infer<typeof zEbookIssuanceCreate>;
  Doc: z.infer<typeof zEbookIssuanceDoc>;
  Entry: z.infer<typeof zEbookIssuanceEntry>;
  Fields: z.infer<typeof zEbookIssuanceFields>;
  Kind: z.infer<typeof zEbookIssuanceKind>;
};
