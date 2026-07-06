import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zDocCommon } from "./utils";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookGrantFields = z.object({
  issuedAt: z.number(),
  profileId: zid("profiles"),
  tokenHash: z.string(),
});
export const zEbookGrantDoc = z.object({ ...zDocCommon("ebookGrants").shape, ...zEbookGrantFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookGrantCreate = zEbookGrantFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookGrants = {
  Create: z.infer<typeof zEbookGrantCreate>;
  Doc: z.infer<typeof zEbookGrantDoc>;
  Fields: z.infer<typeof zEbookGrantFields>;
};
