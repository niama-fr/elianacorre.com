import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const requestKinds = ["access", "erasure", "export", "objection", "rectification", "suppressionRemoval", "unsubscription"] as const;
const kinds = [...requestKinds, "verification"] as const;
export const zPrivacyAuditKind = z.literal(kinds);

export const zPrivacyVerificationMethod = z.literal(["additionalEvidence", "canonicalEmailChallenge"]);
export const zPrivacyRequestKind = z.literal(requestKinds);

// OUTCOME ---------------------------------------------------------------------------------------------------------------------------------
const outcomes = ["completed", "failed", "rejected"] as const;
export const zPrivacyAuditOutcome = z.literal(outcomes);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zCommonFields = z.object({
  outcome: zPrivacyAuditOutcome,
  performedBy: zid("profiles"),
  subjectHash: z.string(),
});
const zOperationFields = z.object({ ...zCommonFields.shape, kind: zPrivacyRequestKind });
const zVerificationFields = z.object({
  ...zCommonFields.shape,
  kind: z.literal("verification"),
  requestKind: zPrivacyRequestKind,
  verificationMethod: zPrivacyVerificationMethod,
});
export const zPrivacyAuditFields = z.discriminatedUnion("kind", [zOperationFields, zVerificationFields]);
const zOperationDoc = z.object({ ...zDocCommon("privacyAudits").shape, ...zOperationFields.shape });
const zVerificationDoc = z.object({ ...zDocCommon("privacyAudits").shape, ...zVerificationFields.shape });
export const zPrivacyAuditDoc = z.discriminatedUnion("kind", [zOperationDoc, zVerificationDoc]);

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
const zOperationEntry = zOperationDoc.omit({ subjectHash: true });
const zVerificationEntry = zVerificationDoc.omit({ subjectHash: true });
export const zPrivacyAuditEntry = z.discriminatedUnion("kind", [zOperationEntry, zVerificationEntry]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const zOperationCreate = z.object({ ...zOperationFields.omit({ subjectHash: true }).shape, email: z.string() });
const zVerificationCreate = z.object({ ...zVerificationFields.omit({ subjectHash: true }).shape, email: z.string() });
export const zPrivacyAuditCreate = z.discriminatedUnion("kind", [zOperationCreate, zVerificationCreate]);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type PrivacyAudits = {
  Create: z.infer<typeof zPrivacyAuditCreate>;
  Doc: z.infer<typeof zPrivacyAuditDoc>;
  Entry: z.infer<typeof zPrivacyAuditEntry>;
  Fields: z.infer<typeof zPrivacyAuditFields>;
  Kind: z.infer<typeof zPrivacyAuditKind>;
  Outcome: z.infer<typeof zPrivacyAuditOutcome>;
  RequestKind: z.infer<typeof zPrivacyRequestKind>;
  VerificationMethod: z.infer<typeof zPrivacyVerificationMethod>;
};
