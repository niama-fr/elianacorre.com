import { GenericId, SystemFields } from "@confect/core";
import { sCanonicalEmail, sTrimOptional } from "@ec/domain/schemas/utils";
import { Effect as E, Schema as S, Struct } from "effect";

// ISSUES ------------------------------------------------------------------------------------------------------------------------------
export const NEWS_SUBSCRIPTION_ISSUE = {
  consentRequired: "NEWS_SUBSCRIPTION_CONSENT_REQUIRED",
} as const;

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sLegalTextId = GenericId.GenericId("legalTexts");
const sProfileId = GenericId.GenericId("profiles");

// CONFIRMED FROM --------------------------------------------------------------------------------------------------------------------------
export const sNewsSubscriptionConfirmedFrom = S.Literals(["email", "loops"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsSubscriptionFields = S.Struct({
  confirmedAt: S.NullOr(S.Finite),
  confirmedFrom: S.NullOr(sNewsSubscriptionConfirmedFrom),
  privacyNoticeId: sLegalTextId,
  profileId: sProfileId,
  requestedAt: S.Finite,
  unsubscribedAt: S.NullOr(S.Finite),
});

export const sNewsSubscriptionDoc = sNewsSubscriptionFields.pipe(S.fieldsAssign(SystemFields.SystemFields("newsSubscriptions").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsSubscriptionCreate = sNewsSubscriptionFields.mapFields(Struct.pick(["privacyNoticeId", "profileId", "requestedAt"]));

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const sNewsSubscriptionPatch = sNewsSubscriptionFields
  .mapFields(Struct.pick(["confirmedAt", "confirmedFrom", "privacyNoticeId", "requestedAt", "unsubscribedAt"]))
  .mapFields(Struct.map(S.optionalKey));

// UPSERT ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsSubscriptionUpsert = S.Struct({
  consent: S.Boolean.check(S.makeFilter((value): value is true => value)),
  email: sCanonicalEmail,
  firstName: sTrimOptional,
  privacyNoticeId: sLegalTextId,
  website: S.Trim.pipe(S.withDecodingDefault(E.succeed(""))),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsSubscriptions = {
  ConfirmedFrom: typeof sNewsSubscriptionConfirmedFrom.Type;
  Create: typeof sNewsSubscriptionCreate.Type;
  Doc: typeof sNewsSubscriptionDoc.Type;
  Fields: typeof sNewsSubscriptionFields.Type;
  Patch: typeof sNewsSubscriptionPatch.Type;
  Upsert: typeof sNewsSubscriptionUpsert.Type;
};
