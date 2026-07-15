import { zPrivacyAuditRequestKind } from "@ec/domain/schemas/privacy-audits";
import { zCanonicalEmail, zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zPrivacyAuthorizationFields = z.object({
  expiresAt: z.number(),
  requestKind: zPrivacyAuditRequestKind,
  subjectHash: z.string(),
  verificationAuditId: zid("privacyAudits"),
});
export const zPrivacyAuthorizationDoc = z.object({
  ...zDocCommon("privacyAuthorizations").shape,
  ...zPrivacyAuthorizationFields.shape,
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zPrivacyAuthorizationCreate = z.object({
  ...zPrivacyAuthorizationFields.omit({ subjectHash: true }).shape,
  email: zCanonicalEmail,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type PrivacyAuthorizations = {
  Create: z.infer<typeof zPrivacyAuthorizationCreate>;
  Doc: z.infer<typeof zPrivacyAuthorizationDoc>;
  Fields: z.infer<typeof zPrivacyAuthorizationFields>;
};
