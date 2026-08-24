import { SystemFields } from "@confect/core";
import { Schema as S } from "effect";

// FAILURE PHASE ---------------------------------------------------------------------------------------------------------------------------
export const retentionRunFailurePhases = ["downloads", "profiles", "tasks", "webhooks"] as const;

export const sRetentionRunFailurePhase = S.Literals(retentionRunFailurePhases);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
const statuses = ["completed", "failed", "running"] as const;

export const sRetentionRunStatus = S.Literals(statuses);

// COUNTS ----------------------------------------------------------------------------------------------------------------------------------
export const sRetentionRunCounts = S.Struct({
  anonymizedFormerProfiles: S.Natural,
  anonymizedPendingProfiles: S.Natural,
  deletedDownloads: S.Natural,
  deletedTechnicalLogs: S.Natural,
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

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type RetentionRuns = {
  Counts: typeof sRetentionRunCounts.Type;
  Doc: typeof sRetentionRunDoc.Type;
  FailurePhase: typeof sRetentionRunFailurePhase.Type;
  Fields: typeof sRetentionRunFields.Type;
  Status: typeof sRetentionRunStatus.Type;
};
