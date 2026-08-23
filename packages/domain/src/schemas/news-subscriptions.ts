import { GenericId, SystemFields } from "@confect/core";
import { sCanonicalEmail, sCanonicalEmailValue, sOptionalTrim } from "@ec/domain/schemas/utils";
import { Effect as E, Schema as S, Struct } from "effect";

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

// UPSERT ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsSubscriptionUpsertValues = S.toStandardSchemaV1(
  S.Struct({
    consent: S.toStandardSchemaV1(
      S.Boolean.check(S.makeFilter((value) => value, { message: "Vous devez accepter de recevoir la lettre" }))
    ),
    email: S.toStandardSchemaV1(sCanonicalEmailValue),
    firstName: S.toStandardSchemaV1(S.Trim),
    privacyNoticeId: S.toStandardSchemaV1(sLegalTextId),
    website: S.toStandardSchemaV1(S.Trim),
  })
);

export const sNewsSubscriptionUpsert = S.Struct({
  consent: S.Boolean.check(S.makeFilter((value): value is true => value)),
  email: sCanonicalEmail,
  firstName: sOptionalTrim,
  privacyNoticeId: sLegalTextId,
  requestIp: S.Trim.check(S.isNonEmpty()),
  website: S.Trim.pipe(S.withDecodingDefault(E.succeed(""))),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsSubscriptions = {
  ConfirmedFrom: typeof sNewsSubscriptionConfirmedFrom.Type;
  Create: typeof sNewsSubscriptionCreate.Type;
  Doc: typeof sNewsSubscriptionDoc.Type;
  Fields: typeof sNewsSubscriptionFields.Type;
  Upsert: typeof sNewsSubscriptionUpsert.Type;
  UpsertValues: typeof sNewsSubscriptionUpsertValues.Type;
};
