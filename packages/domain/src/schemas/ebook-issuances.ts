import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zEbookDto } from "./ebooks";

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

// DTO -------------------------------------------------------------------------------------------------------------------------------------
export const zEbookIssuanceDto = z.object({ ...zEbookIssuanceDoc.shape, ebook: zEbookDto });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookIssuanceCreate = zEbookIssuanceFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookIssuances = {
  Create: z.infer<typeof zEbookIssuanceCreate>;
  Doc: z.infer<typeof zEbookIssuanceDoc>;
  Dto: z.infer<typeof zEbookIssuanceDto>;
  Fields: z.infer<typeof zEbookIssuanceFields>;
  Kind: z.infer<typeof zEbookIssuanceKind>;
};
