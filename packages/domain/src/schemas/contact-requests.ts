import { GenericId, SystemFields } from "@confect/core";
import { Schema as S } from "effect";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sContactRequestFields = S.Struct({
  message: S.String,
  profileId: GenericId.GenericId("profiles"),
});

export const sContactRequestDoc = sContactRequestFields.pipe(S.fieldsAssign(SystemFields.SystemFields("contactRequests").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sContactRequestCreate = sContactRequestFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type ContactRequests = {
  Create: typeof sContactRequestCreate.Type;
  Doc: typeof sContactRequestDoc.Type;
  Fields: typeof sContactRequestFields.Type;
};
