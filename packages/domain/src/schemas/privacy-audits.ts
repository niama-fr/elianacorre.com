import { GenericId, SystemFields } from "@confect/core";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Schema as S, Struct } from "effect";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const requestKinds = ["access", "erasure", "export", "objection", "rectification", "suppressionRemoval", "unsubscription"] as const;

const kinds = [...requestKinds, "verification"] as const;

const verificationMethods = ["additionalEvidence", "emailChallenge"] as const;

const outcomes = ["completed", "rejected"] as const;

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sPrivacyAuditId = GenericId.GenericId("privacyAudits");
const sProfileId = GenericId.GenericId("profiles");

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const sPrivacyAuditKind = S.Literals(kinds);
export const sPrivacyAuditRequestKind = S.Literals(requestKinds);

// VERIFICATION METHOD ---------------------------------------------------------------------------------------------------------------------
export const sPrivacyAuditVerificationMethod = S.Literals(verificationMethods);

// OUTCOME ---------------------------------------------------------------------------------------------------------------------------------
export const sPrivacyAuditOutcome = S.Literals(outcomes);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const sCommonFields = S.Struct({
  outcome: sPrivacyAuditOutcome,
  performedBy: sProfileId,
  subjectHash: S.String,
});

const sRequestFields = sCommonFields.pipe(
  S.fieldsAssign({
    kind: sPrivacyAuditRequestKind,
    verificationAuditId: sPrivacyAuditId,
  })
);

const sVerificationFields = sCommonFields.pipe(
  S.fieldsAssign({
    kind: S.Literal("verification"),
    method: sPrivacyAuditVerificationMethod,
    requestKind: sPrivacyAuditRequestKind,
  })
);

export const sPrivacyAuditFields = S.Union([sRequestFields, sVerificationFields]);

// DOC -------------------------------------------------------------------------------------------------------------------------------------
const sSystemFields = SystemFields.SystemFields("privacyAudits").fields;

const sRequestDoc = sRequestFields.pipe(S.fieldsAssign(sSystemFields));

const sVerificationDoc = sVerificationFields.pipe(S.fieldsAssign(sSystemFields));

export const sPrivacyAuditDoc = S.Union([sRequestDoc, sVerificationDoc]);

// ENTRY -----------------------------------------------------------------------------------------------------------------------------------
const sRequestEntry = sRequestDoc.mapFields(Struct.omit(["subjectHash"]));

const sVerificationEntry = sVerificationDoc.mapFields(Struct.omit(["subjectHash"]));

export const sPrivacyAuditEntry = S.Union([sRequestEntry, sVerificationEntry]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sPrivacyAuditRequestCreate = sRequestFields.mapFields(Struct.omit(["subjectHash"])).pipe(
  S.fieldsAssign({
    email: sCanonicalEmail,
  })
);

export const sPrivacyAuditVerificationCreate = sVerificationFields.mapFields(Struct.omit(["kind", "subjectHash"])).pipe(
  S.fieldsAssign({
    email: sCanonicalEmail,
  })
);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type PrivacyAudits = {
  Doc: typeof sPrivacyAuditDoc.Type;
  Entry: typeof sPrivacyAuditEntry.Type;
  Fields: typeof sPrivacyAuditFields.Type;
  Kind: typeof sPrivacyAuditKind.Type;
  Outcome: typeof sPrivacyAuditOutcome.Type;
  RequestCreate: typeof sPrivacyAuditRequestCreate.Type;
  RequestKind: typeof sPrivacyAuditRequestKind.Type;
  VerificationCreate: typeof sPrivacyAuditVerificationCreate.Type;
  VerificationMethod: typeof sPrivacyAuditVerificationMethod.Type;
};
