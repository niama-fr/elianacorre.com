import { SystemFields } from "@confect/core";
import { Schema as S } from "effect";
import { z } from "zod";

// FAILURE PHASE ---------------------------------------------------------------------------------------------------------------------------
export const retentionRunFailurePhases = ["downloads", "profiles", "tasks", "webhooks"] as const;

export const sRetentionRunFailurePhase = S.Literals(retentionRunFailurePhases);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
const statuses = ["completed", "failed", "running"] as const;

export const sRetentionRunStatus = S.Literals(statuses);

// COUNTS ----------------------------------------------------------------------------------------------------------------------------------
export const sRetentionRunCounts = S.Struct({
  anonymizedFormerProfiles: S.Finite,
  anonymizedPendingProfiles: S.Finite,
  deletedDownloads: S.Finite,
  deletedTechnicalLogs: S.Finite,
});

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sRetentionRunFields = sRetentionRunCounts.pipe(
  S.fieldsAssign({
    failedAt: S.NullOr(S.Finite),
    failurePhase: S.NullOr(sRetentionRunFailurePhase),
    finishedAt: S.NullOr(S.Finite),
    status: sRetentionRunStatus,
    workflowId: S.NullOr(S.String),
  })
);

export const sRetentionRunDoc = sRetentionRunFields.pipe(S.fieldsAssign(SystemFields.SystemFields("retentionRuns").fields));

// LEGACY ----------------------------------------------------------------------------------------------------------------------------------
// Temporary while convex/retention.ts still uses Zod function arguments.
export const zRetentionRunFailurePhase = z.literal(retentionRunFailurePhases);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type RetentionRuns = {
  Counts: typeof sRetentionRunCounts.Type;
  Doc: typeof sRetentionRunDoc.Type;
  FailurePhase: typeof sRetentionRunFailurePhase.Type;
  Fields: typeof sRetentionRunFields.Type;
  Status: typeof sRetentionRunStatus.Type;
};
