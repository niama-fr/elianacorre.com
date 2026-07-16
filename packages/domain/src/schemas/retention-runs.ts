import { zDocCommon } from "@ec/domain/schemas/utils";
import z from "zod";

// FAILURE PHASE ---------------------------------------------------------------------------------------------------------------------------
export const retentionRunFailurePhases = ["downloads", "profiles", "tasks", "webhooks"] as const;
export const zRetentionRunFailurePhase = z.literal(retentionRunFailurePhases);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
const statuses = ["completed", "failed", "running"] as const;
export const zRetentionRunStatus = z.literal(statuses);

// COUNTS ----------------------------------------------------------------------------------------------------------------------------------
export const zRetentionRunCounts = z.object({
  anonymizedFormerProfiles: z.number(),
  anonymizedPendingProfiles: z.number(),
  deletedDownloads: z.number(),
  deletedTechnicalLogs: z.number(),
});

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zRetentionRunFields = z.object({
  ...zRetentionRunCounts.shape,
  failedAt: z.number().nullable(),
  failurePhase: zRetentionRunFailurePhase.nullable(),
  finishedAt: z.number().nullable(),
  status: zRetentionRunStatus,
  workflowId: z.string().nullable(),
});
export const zRetentionRunDoc = z.object({ ...zDocCommon("retentionRuns").shape, ...zRetentionRunFields.shape });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type RetentionRuns = {
  Counts: z.infer<typeof zRetentionRunCounts>;
  Doc: z.infer<typeof zRetentionRunDoc>;
  FailurePhase: z.infer<typeof zRetentionRunFailurePhase>;
  Fields: z.infer<typeof zRetentionRunFields>;
  Status: z.infer<typeof zRetentionRunStatus>;
};
