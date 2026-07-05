import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zDocCommon } from "./utils";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const zEmailProviderJobKind = z.literal(["confirmation", "ebook", "newsletter-contact-sync"]);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zEmailProviderJobStatus = z.literal(["failed", "pending", "sending", "sent"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
const zEmailProviderJobOperationalFields = z.object({
  attempts: z.int().nonnegative(),
  idempotencyKey: z.string(),
  lastError: z.string().nullable(),
  leaseExpiresAt: z.number().nullable(),
  nextAttemptAt: z.number(),
  profileId: zid("profiles"),
  sentAt: z.number().nullable(),
  status: zEmailProviderJobStatus,
});
const zConfirmationEmailProviderJobFields = zEmailProviderJobOperationalFields.extend({
  kind: z.literal("confirmation"),
  linkToken: z.string(),
});
const zEbookEmailProviderJobFields = zEmailProviderJobOperationalFields.extend({ kind: z.literal("ebook"), linkToken: z.string() });
const zNewsletterContactSyncJobFields = zEmailProviderJobOperationalFields.extend({ kind: z.literal("newsletter-contact-sync") });
export const zEmailProviderJobFields = z.discriminatedUnion("kind", [
  zConfirmationEmailProviderJobFields,
  zEbookEmailProviderJobFields,
  zNewsletterContactSyncJobFields,
]);
const emailProviderJobDocShape = zDocCommon("emailProviderJobs").shape;
export const zEmailProviderJobDoc = z.discriminatedUnion("kind", [
  zConfirmationEmailProviderJobFields.extend(emailProviderJobDocShape),
  zEbookEmailProviderJobFields.extend(emailProviderJobDocShape),
  zNewsletterContactSyncJobFields.extend(emailProviderJobDocShape),
]);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const zEmailProviderJobCreateCommon = zEmailProviderJobOperationalFields.pick({
  idempotencyKey: true,
  nextAttemptAt: true,
  profileId: true,
});
export const zEmailProviderJobCreate = z.discriminatedUnion("kind", [
  zEmailProviderJobCreateCommon.extend({ kind: z.literal("confirmation"), linkToken: z.string() }),
  zEmailProviderJobCreateCommon.extend({ kind: z.literal("ebook"), linkToken: z.string() }),
  zEmailProviderJobCreateCommon.extend({ kind: z.literal("newsletter-contact-sync") }),
]);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EmailProviderJobs = {
  Create: z.infer<typeof zEmailProviderJobCreate>;
  Doc: z.infer<typeof zEmailProviderJobDoc>;
  Fields: z.infer<typeof zEmailProviderJobFields>;
  Kind: z.infer<typeof zEmailProviderJobKind>;
  OperationalFields: z.infer<typeof zEmailProviderJobOperationalFields>;
  Status: z.infer<typeof zEmailProviderJobStatus>;
};
