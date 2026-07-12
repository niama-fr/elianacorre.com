import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["subscription", "reactivation"] as const;
export const zNewsConfirmationKind = z.literal(kinds);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zCommonFields = z.object({
  subscriptionId: zid("newsSubscriptions"),
});
const zSubscriptionFields = z.object({
  ...zCommonFields.shape,
  kind: z.literal(kinds[0]),
  restrictionId: z.nullable(zid("newsRestrictions")),
  restrictionVersion: z.nullable(z.number()),
});
const zReactivationFields = z.object({
  ...zCommonFields.shape,
  kind: z.literal(kinds[1]),
  restrictionId: zid("newsRestrictions"),
  restrictionVersion: z.number(),
});
export const zNewsConfirmationFields = z.discriminatedUnion("kind", [zSubscriptionFields, zReactivationFields]);

const zSubscriptionDoc = z.object({ ...zDocCommon("newsConfirmations").shape, ...zSubscriptionFields.shape });
const zReactivationDoc = z.object({ ...zDocCommon("newsConfirmations").shape, ...zReactivationFields.shape });
export const zNewsConfirmationDoc = z.discriminatedUnion("kind", [zSubscriptionDoc, zReactivationDoc]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsConfirmationCreate = zNewsConfirmationFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsConfirmations = {
  Create: z.infer<typeof zNewsConfirmationCreate>;
  Doc: z.infer<typeof zNewsConfirmationDoc>;
  Fields: z.infer<typeof zNewsConfirmationFields>;
  ReactivationDoc: z.infer<typeof zReactivationDoc>;
  SubscriptionDoc: z.infer<typeof zSubscriptionDoc>;
};
