import { GenericId, SystemFields } from "@confect/core";
import { Schema as S } from "effect";

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sProfileId = GenericId.GenericId("profiles");

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const sLegalTextKind = S.Literal("privacyNotice");

// CONTENT ---------------------------------------------------------------------------------------------------------------------------------
// Nonblank CommonMark Markdown; raw HTML is not part of the supported rendering contract.
export const sMarkdownContent = S.Trim.check(S.isMinLength(1));

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sLegalTextFields = S.Struct({
  content: sMarkdownContent,
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
