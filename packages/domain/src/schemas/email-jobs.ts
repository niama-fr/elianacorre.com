import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zDocCommon } from "./utils";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const zEmailJobKind = z.literal(["confirmation", "ebook"]);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const zEmailJobStatus = z.literal(["failed", "pending", "sending", "sent"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zEmailJobFields = z.object({
  attempts: z.int().nonnegative(),
  idempotencyKey: z.string(),
  kind: zEmailJobKind,
  lastError: z.string().nullable(),
  leaseExpiresAt: z.number().nullable(),
  linkToken: z.string(),
  nextAttemptAt: z.number(),
  profileId: zid("profiles"),
  sentAt: z.number().nullable(),
  status: zEmailJobStatus,
});
export const zEmailJobDoc = z.object({ ...zDocCommon("emailJobs").shape, ...zEmailJobFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zEmailJobCreate = zEmailJobFields.pick({
  idempotencyKey: true,
  kind: true,
  linkToken: true,
  nextAttemptAt: true,
  profileId: true,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EmailJobs = {
  Create: z.infer<typeof zEmailJobCreate>;
  Doc: z.infer<typeof zEmailJobDoc>;
  Fields: z.infer<typeof zEmailJobFields>;
  Kind: z.infer<typeof zEmailJobKind>;
  Status: z.infer<typeof zEmailJobStatus>;
};
