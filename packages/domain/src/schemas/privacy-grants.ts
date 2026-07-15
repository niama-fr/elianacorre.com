import { zPrivacyAuditRequestKind } from "@ec/domain/schemas/privacy-audits";
import { zCanonicalEmail, zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zPrivacyGrantFields = z.object({
  expiresAt: z.number(),
  requestKind: zPrivacyAuditRequestKind,
  subjectHash: z.string(),
  verificationAuditId: zid("privacyAudits"),
});
export const zPrivacyGrantDoc = z.object({ ...zDocCommon("privacyGrants").shape, ...zPrivacyGrantFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zPrivacyGrantCreate = z.object({
  ...zPrivacyGrantFields.omit({ subjectHash: true }).shape,
  email: zCanonicalEmail,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type PrivacyGrants = {
  Create: z.infer<typeof zPrivacyGrantCreate>;
  Doc: z.infer<typeof zPrivacyGrantDoc>;
  Fields: z.infer<typeof zPrivacyGrantFields>;
};
