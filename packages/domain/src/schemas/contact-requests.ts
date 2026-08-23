import { GenericId, SystemFields } from "@confect/core";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sRequiredText = S.Trim.check(S.isMinLength(1, { message: "Ce champ est requis" }));

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sContactRequestFields = S.Struct({
  message: S.String,
  profileId: GenericId.GenericId("profiles"),
});

export const sContactRequestDoc = sContactRequestFields.pipe(S.fieldsAssign(SystemFields.SystemFields("contactRequests").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sContactRequestCreateValues = S.toStandardSchemaV1(
  S.Struct({
    email: S.toStandardSchemaV1(sCanonicalEmail),
    firstName: S.toStandardSchemaV1(sRequiredText),
    message: S.toStandardSchemaV1(sRequiredText),
  })
);

export const sContactCreate = sContactRequestFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type ContactRequests = {
  Create: typeof sContactCreate.Type;
  CreateValues: typeof sContactRequestCreateValues.Type;
  Doc: typeof sContactRequestDoc.Type;
  Fields: typeof sContactRequestFields.Type;
};
