import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zDocCommon } from "./utils";

// ENUMS -----------------------------------------------------------------------------------------------------------------------------------
export const zNewsRestrictionReason = z.literal(["permanentBounce", "spamComplaint"]);
export const zNewsRestrictionSource = z.literal(["admin", "provider"]);
export const zNewsRestrictionResolvedBy = z.literal(["admin", "confirmation"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsRestrictionFields = z.object({
  lastOccurredAt: z.number(),
  profileId: zid("profiles"),
  reason: zNewsRestrictionReason,
  resolvedAt: z.number().nullable(),
  resolvedBy: zNewsRestrictionResolvedBy.nullable(),
  restrictedAt: z.number(),
  source: zNewsRestrictionSource,
  version: z.number(),
});
export const zNewsRestrictionDoc = z.object({ ...zDocCommon("newsRestrictions").shape, ...zNewsRestrictionFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsRestrictionCreate = zNewsRestrictionFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsRestrictions = {
  Create: z.infer<typeof zNewsRestrictionCreate>;
  Doc: z.infer<typeof zNewsRestrictionDoc>;
  Fields: z.infer<typeof zNewsRestrictionFields>;
  Reason: z.infer<typeof zNewsRestrictionReason>;
};
