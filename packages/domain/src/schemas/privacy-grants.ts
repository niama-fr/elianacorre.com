import { GenericId, SystemFields } from "@confect/core";
import { Schema as S, Struct } from "effect";

import { sPrivacyAuditRequestKind } from "./privacy-audits";
import { sCanonicalEmail } from "./utils";

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sPrivacyAuditId = GenericId.GenericId("privacyAudits");

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sPrivacyGrantFields = S.Struct({
  expiresAt: S.Finite,
  requestKind: sPrivacyAuditRequestKind,
  subjectHash: S.String,
  verificationAuditId: sPrivacyAuditId,
});

export const sPrivacyGrantDoc = sPrivacyGrantFields.pipe(S.fieldsAssign(SystemFields.SystemFields("privacyGrants").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sPrivacyGrantCreate = sPrivacyGrantFields.mapFields(Struct.omit(["subjectHash"])).pipe(
  S.fieldsAssign({
    email: sCanonicalEmail,
  })
);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type PrivacyGrants = {
  Create: typeof sPrivacyGrantCreate.Type;
  Doc: typeof sPrivacyGrantDoc.Type;
  Fields: typeof sPrivacyGrantFields.Type;
};
