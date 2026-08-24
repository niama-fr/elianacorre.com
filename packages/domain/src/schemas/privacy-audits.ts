import { GenericId, SystemFields } from "@confect/core";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Schema as S, Struct } from "effect";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const requestKinds = ["access", "erasure", "export", "objection", "rectification", "suppressionRemoval", "unsubscription"] as const;
const finalRequestKinds = ["access", "export", "objection", "rectification", "suppressionRemoval", "unsubscription"] as const;

const kinds = [...requestKinds, "verification"] as const;

const verificationMethods = ["additionalEvidence", "emailChallenge"] as const;

const finalOutcomes = ["completed", "rejected"] as const;
const outcomes = [...finalOutcomes, "pending"] as const;

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
export const sPrivacyAuditFinalOutcome = S.Literals(finalOutcomes);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const sCommonFields = S.Struct({
  performedBy: sProfileId,
  subjectHash: S.String,
});

const sFinalRequestFields = sCommonFields.pipe(
  S.fieldsAssign({
    kind: S.Literals(finalRequestKinds),
    outcome: sPrivacyAuditFinalOutcome,
    verificationAuditId: sPrivacyAuditId,
  })
);

const sErasureRequestFields = sCommonFields.pipe(
  S.fieldsAssign({
    kind: S.Literal("erasure"),
    outcome: sPrivacyAuditOutcome,
    verificationAuditId: sPrivacyAuditId,
  })
);

const sVerificationFields = sCommonFields.pipe(
  S.fieldsAssign({
    kind: S.Literal("verification"),
    method: sPrivacyAuditVerificationMethod,
    outcome: sPrivacyAuditFinalOutcome,
    requestKind: sPrivacyAuditRequestKind,
  })
);

export const sPrivacyAuditFields = S.Union([sFinalRequestFields, sErasureRequestFields, sVerificationFields]);

// DOC -------------------------------------------------------------------------------------------------------------------------------------
const sSystemFields = SystemFields.SystemFields("privacyAudits").fields;

const sFinalRequestDoc = sFinalRequestFields.pipe(S.fieldsAssign(sSystemFields));

const sErasureRequestDoc = sErasureRequestFields.pipe(S.fieldsAssign(sSystemFields));

const sVerificationDoc = sVerificationFields.pipe(S.fieldsAssign(sSystemFields));

export const sPrivacyAuditDoc = S.Union([sFinalRequestDoc, sErasureRequestDoc, sVerificationDoc]);

// ENTRY -----------------------------------------------------------------------------------------------------------------------------------
const sFinalRequestEntry = sFinalRequestDoc.mapFields(Struct.omit(["subjectHash"]));

const sErasureRequestEntry = sErasureRequestDoc.mapFields(Struct.omit(["subjectHash"]));

const sVerificationEntry = sVerificationDoc.mapFields(Struct.omit(["subjectHash"]));

export const sPrivacyAuditEntry = S.Union([sFinalRequestEntry, sErasureRequestEntry, sVerificationEntry]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sPrivacyAuditRequestCreate = S.Union([
  sFinalRequestFields.mapFields(Struct.omit(["subjectHash"])).pipe(S.fieldsAssign({ email: sCanonicalEmail })),
  sErasureRequestFields.mapFields(Struct.omit(["subjectHash"])).pipe(S.fieldsAssign({ email: sCanonicalEmail })),
]);

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
  FinalOutcome: typeof sPrivacyAuditFinalOutcome.Type;
  RequestCreate: typeof sPrivacyAuditRequestCreate.Type;
  RequestKind: typeof sPrivacyAuditRequestKind.Type;
  VerificationCreate: typeof sPrivacyAuditVerificationCreate.Type;
  VerificationMethod: typeof sPrivacyAuditVerificationMethod.Type;
};
