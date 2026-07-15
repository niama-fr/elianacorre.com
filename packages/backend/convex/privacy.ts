import { zPrivacyAuditRequestKind, zPrivacyAuditVerificationMethod } from "@ec/domain/schemas/privacy-audits";
import { zCanonicalEmail, zConfirmedEmailPayload } from "@ec/domain/schemas/utils";
import z from "zod";

import {
  inspectPrivacySubject,
  processPrivacyAccess,
  processPrivacyErasure,
  processPrivacyExport,
  processPrivacyObjection,
  processPrivacyRectification,
  processPrivacySuppressionRemoval,
  processPrivacyUnsubscription,
  processPrivacyVerification,
} from "../business/privacy";
import { zAdminMutation, zAdminQuery } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const inspectSubject = zAdminQuery({
  args: { email: zCanonicalEmail },
  handler: async (ctx, { email }) => await inspectPrivacySubject(ctx, email),
});

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const fulfillAccessRequest = zAdminMutation({
  args: zConfirmedEmailPayload,
  handler: async (ctx, { email }) => await processPrivacyAccess(ctx, email),
});

export const fulfillErasureRequest = zAdminMutation({
  args: zConfirmedEmailPayload,
  handler: async (ctx, { email }) => await processPrivacyErasure(ctx, email),
});

export const fulfillExportRequest = zAdminMutation({
  args: zConfirmedEmailPayload,
  handler: async (ctx, { email }) => await processPrivacyExport(ctx, email),
});

export const fulfillObjectionRequest = zAdminMutation({
  args: zConfirmedEmailPayload,
  handler: async (ctx, { email }) => await processPrivacyObjection(ctx, email),
});

export const fulfillRectificationRequest = zAdminMutation({
  args: z.object({
    ...zConfirmedEmailPayload.shape,
    firstName: z
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value)),
  }),
  handler: async (ctx, { email, firstName }) => await processPrivacyRectification(ctx, { email, firstName }),
});

export const fulfillSuppressionRemovalRequest = zAdminMutation({
  args: zConfirmedEmailPayload,
  handler: async (ctx, { email }) => await processPrivacySuppressionRemoval(ctx, email),
});

export const fulfillUnsubscriptionRequest = zAdminMutation({
  args: zConfirmedEmailPayload,
  handler: async (ctx, { email }) => await processPrivacyUnsubscription(ctx, email),
});

export const recordVerification = zAdminMutation({
  args: z.object({
    email: zCanonicalEmail,
    method: zPrivacyAuditVerificationMethod,
    outcome: z.literal(["completed", "rejected"]),
    requestKind: zPrivacyAuditRequestKind,
  }),
  handler: async (ctx, payload) => await processPrivacyVerification(ctx, payload),
});
