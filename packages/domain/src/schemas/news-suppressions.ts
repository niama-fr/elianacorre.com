import { SystemFields } from "@confect/core";
import { Schema as S } from "effect";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsSuppressionFields = S.Struct({
  canonicalEmailHash: S.String,
});

export const sNewsSuppressionDoc = sNewsSuppressionFields.pipe(S.fieldsAssign(SystemFields.SystemFields("newsSuppressions").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsSuppressionCreate = sNewsSuppressionFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsSuppressions = {
  Create: typeof sNewsSuppressionCreate.Type;
  Doc: typeof sNewsSuppressionDoc.Type;
  Fields: typeof sNewsSuppressionFields.Type;
};
