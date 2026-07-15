import { zCanonicalEmail, zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const requestKinds = ["access", "erasure", "export", "objection", "rectification", "suppressionRemoval", "unsubscription"] as const;
const kinds = [...requestKinds, "verification"] as const;
export const zPrivacyAuditKind = z.literal(kinds);
export const zPrivacyAuditRequestKind = z.literal(requestKinds);

// VERIFICATION METHOD ---------------------------------------------------------------------------------------------------------------------
const verificationMethods = ["additionalEvidence", "emailChallenge"] as const;
export const zPrivacyAuditVerificationMethod = z.literal(verificationMethods);

// OUTCOME ---------------------------------------------------------------------------------------------------------------------------------
const outcomes = ["completed", "rejected"] as const;
export const zPrivacyAuditOutcome = z.literal(outcomes);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zCommonFields = z.object({
  outcome: zPrivacyAuditOutcome,
  performedBy: zid("profiles"),
  subjectHash: z.string(),
});
const zRequestFields = z.object({
  ...zCommonFields.shape,
  kind: zPrivacyAuditRequestKind,
  verificationAuditId: zid("privacyAudits"),
});
const zVerificationFields = z.object({
  ...zCommonFields.shape,
  kind: z.literal("verification"),
  method: zPrivacyAuditVerificationMethod,
  requestKind: zPrivacyAuditRequestKind,
});
export const zPrivacyAuditFields = z.discriminatedUnion("kind", [zRequestFields, zVerificationFields]);

const zRequestDoc = z.object({ ...zDocCommon("privacyAudits").shape, ...zRequestFields.shape });
const zVerificationDoc = z.object({ ...zDocCommon("privacyAudits").shape, ...zVerificationFields.shape });
export const zPrivacyAuditDoc = z.discriminatedUnion("kind", [zRequestDoc, zVerificationDoc]);

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
const zRequestEntry = zRequestDoc.omit({ subjectHash: true });
const zVerificationEntry = zVerificationDoc.omit({ subjectHash: true });
export const zPrivacyAuditEntry = z.discriminatedUnion("kind", [zRequestEntry, zVerificationEntry]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const zRequestCreate = z.object({ ...zRequestFields.omit({ subjectHash: true }).shape, email: zCanonicalEmail });

export const zPrivacyAuditVerificationCreate = z.object({
  ...zVerificationFields.omit({ kind: true, subjectHash: true }).shape,
  email: zCanonicalEmail,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type PrivacyAudits = {
  Doc: z.infer<typeof zPrivacyAuditDoc>;
  Entry: z.infer<typeof zPrivacyAuditEntry>;
  Fields: z.infer<typeof zPrivacyAuditFields>;
  Kind: z.infer<typeof zPrivacyAuditKind>;
  Outcome: z.infer<typeof zPrivacyAuditOutcome>;
  RequestCreate: z.infer<typeof zRequestCreate>;
  RequestKind: z.infer<typeof zPrivacyAuditRequestKind>;
  VerificationCreate: z.infer<typeof zPrivacyAuditVerificationCreate>;
  VerificationMethod: z.infer<typeof zPrivacyAuditVerificationMethod>;
};
