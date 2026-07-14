import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["access", "erasure", "export", "objection", "rectification", "suppressionRemoval", "unsubscription"] as const;
export const zPrivacyAuditKind = z.literal(kinds);

// OUTCOME ---------------------------------------------------------------------------------------------------------------------------------
const outcomes = ["completed", "failed", "rejected"] as const;
export const zPrivacyAuditOutcome = z.literal(outcomes);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zPrivacyAuditFields = z.object({
  kind: zPrivacyAuditKind,
  outcome: zPrivacyAuditOutcome,
  performedBy: zid("profiles"),
  subjectHash: z.string(),
});
export const zPrivacyAuditDoc = z.object({ ...zDocCommon("privacyAudits").shape, ...zPrivacyAuditFields.shape });

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zPrivacyAuditEntry = zPrivacyAuditDoc.omit({ subjectHash: true });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zPrivacyAuditCreate = z.object({ ...zPrivacyAuditFields.omit({ subjectHash: true }).shape, email: z.string() });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type PrivacyAudits = {
  Create: z.infer<typeof zPrivacyAuditCreate>;
  Doc: z.infer<typeof zPrivacyAuditDoc>;
  Entry: z.infer<typeof zPrivacyAuditEntry>;
  Fields: z.infer<typeof zPrivacyAuditFields>;
  Kind: z.infer<typeof zPrivacyAuditKind>;
  Outcome: z.infer<typeof zPrivacyAuditOutcome>;
};
