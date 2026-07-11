import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zDocCommon } from "./utils";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zNewsConfirmationCommonFields = z.object({
  expiresAt: z.number(),
  subscriptionId: zid("newsSubscriptions"),
});

const zNewsSubscriptionConfirmationFields = zNewsConfirmationCommonFields.extend({
  kind: z.literal("confirmSubscription"),
});

const zNewsDeliveryConfirmationFields = zNewsConfirmationCommonFields.extend({
  expectedRestrictionVersion: z.number(),
  kind: z.literal("restoreDelivery"),
  restrictionId: zid("newsRestrictions"),
});

export const zNewsConfirmationFields = z.discriminatedUnion("kind", [zNewsSubscriptionConfirmationFields, zNewsDeliveryConfirmationFields]);

const zNewsSubscriptionConfirmationDoc = zNewsSubscriptionConfirmationFields.extend(zDocCommon("newsConfirmations").shape);
const zNewsDeliveryConfirmationDoc = zNewsDeliveryConfirmationFields.extend(zDocCommon("newsConfirmations").shape);
export const zNewsConfirmationDoc = z.discriminatedUnion("kind", [zNewsSubscriptionConfirmationDoc, zNewsDeliveryConfirmationDoc]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsConfirmationCreate = zNewsConfirmationFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsConfirmations = {
  Create: z.infer<typeof zNewsConfirmationCreate>;
  Doc: z.infer<typeof zNewsConfirmationDoc>;
  Fields: z.infer<typeof zNewsConfirmationFields>;
};
