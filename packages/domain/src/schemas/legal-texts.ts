import { GenericId, SystemFields } from "@confect/core";
import { Schema as S } from "effect";

import { sTrimRequired } from "./utils";

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sProfileId = GenericId.GenericId("profiles");

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const sLegalTextKind = S.Literal("privacyNotice");

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sLegalTextFields = S.Struct({
  content: sTrimRequired,
  kind: sLegalTextKind,
  publishedAt: S.Finite,
  publishedBy: sProfileId,
});

export const sLegalTextDoc = sLegalTextFields.pipe(S.fieldsAssign(SystemFields.SystemFields("legalTexts").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sLegalTextCreate = sLegalTextFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type LegalTexts = {
  Create: typeof sLegalTextCreate.Type;
  Doc: typeof sLegalTextDoc.Type;
  Fields: typeof sLegalTextFields.Type;
};
