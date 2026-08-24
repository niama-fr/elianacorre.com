import { GenericId, SystemFields } from "@confect/core";
import { Schema as S } from "effect";

import { sStrictNatural } from "./utils";

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const kinds = ["subscription", "reactivation"] as const;

const sRestrictionId = GenericId.GenericId("newsRestrictions");
const sSubscriptionId = GenericId.GenericId("newsSubscriptions");

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const sNewsConfirmationKind = S.Literals(kinds);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const sSubscriptionFields = S.Struct({
  kind: S.Literal(kinds[0]),
  restrictionId: S.NullOr(sRestrictionId),
  restrictionVersion: S.NullOr(sStrictNatural),
  subscriptionId: sSubscriptionId,
});

const sReactivationFields = S.Struct({
  kind: S.Literal(kinds[1]),
  restrictionId: sRestrictionId,
  restrictionVersion: sStrictNatural,
  subscriptionId: sSubscriptionId,
});

export const sNewsConfirmationFields = S.Union([sSubscriptionFields, sReactivationFields]);

// DOC -------------------------------------------------------------------------------------------------------------------------------------
const sSystemFields = SystemFields.SystemFields("newsConfirmations").fields;

const sSubscriptionDoc = sSubscriptionFields.pipe(S.fieldsAssign(sSystemFields));

const sReactivationDoc = sReactivationFields.pipe(S.fieldsAssign(sSystemFields));

export const sNewsConfirmationDoc = S.Union([sSubscriptionDoc, sReactivationDoc]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsConfirmationCreate = sNewsConfirmationFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsConfirmations = {
  Create: typeof sNewsConfirmationCreate.Type;
  Doc: typeof sNewsConfirmationDoc.Type;
  Fields: typeof sNewsConfirmationFields.Type;
  ReactivationDoc: typeof sReactivationDoc.Type;
  SubscriptionDoc: typeof sSubscriptionDoc.Type;
};
