import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// ENUMS -----------------------------------------------------------------------------------------------------------------------------------
export const zNewsRestrictionReason = z.literal(["permanentBounce", "spamComplaint"]);
export const zNewsRestrictionResolvedBy = z.literal(["admin", "confirmation"]);
export const zNewsRestrictionRestrictedBy = z.literal(["admin", "provider"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsRestrictionFields = z.object({
  lastOccurredAt: z.number(),
  profileId: zid("profiles"),
  reason: zNewsRestrictionReason,
  resolvedAt: z.number().nullable(),
  resolvedBy: zNewsRestrictionResolvedBy.nullable(),
  restrictedAt: z.number(),
  restrictedBy: zNewsRestrictionRestrictedBy,
  version: z.number(),
});
export const zNewsRestrictionDoc = z.object({ ...zDocCommon("newsRestrictions").shape, ...zNewsRestrictionFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsRestrictionCreate = zNewsRestrictionFields.pick({
  lastOccurredAt: true,
  profileId: true,
  reason: true,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsRestrictions = {
  Create: z.infer<typeof zNewsRestrictionCreate>;
  Doc: z.infer<typeof zNewsRestrictionDoc>;
  Fields: z.infer<typeof zNewsRestrictionFields>;
  Reason: z.infer<typeof zNewsRestrictionReason>;
};
