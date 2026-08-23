import type { Id } from "@ec/backend/types";
import type { RetentionRuns } from "@ec/domain/schemas/retention-runs";
import type { WithNow } from "@ec/domain/schemas/utils";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnPatchError, dieOnDecodeError, dieOnEncodeError, optionById } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getRetentionRun = E.fn(function* (id: Id<"retentionRuns">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("retentionRuns").get(id).pipe(optionById);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const takeRecentRetentionRuns = E.fnUntracedEager(function* (limit: number) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("retentionRuns").index("by_creation_time", "desc").take(limit).pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createRetentionRun = E.fn(function* () {
  const writer = yield* DatabaseWriter;
  return yield* writer
    .table("retentionRuns")
    .insert({
      anonymizedFormerProfiles: 0,
      anonymizedPendingProfiles: 0,
      deletedDownloads: 0,
      deletedTechnicalLogs: 0,
      failedAt: null,
      failurePhase: null,
      finishedAt: null,
      status: "running",
      workflowId: null,
    })
    .pipe(dieOnEncodeError);
});

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchRetentionRun = E.fn(function* (id: Id<"retentionRuns">, patch: Partial<RetentionRuns["Fields"]>) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("retentionRuns").patch(id, patch).pipe(dieOnPatchError);
});

// MARK ------------------------------------------------------------------------------------------------------------------------------------

export const markRetentionRunFailed = E.fn(function* (id: Id<"retentionRuns">, { now, phase }: FailedOpts) {
  yield* patchRetentionRun(id, { failedAt: now, failurePhase: phase, status: "failed" });
});
type FailedOpts = WithNow<{ phase: RetentionRuns["FailurePhase"] }>;

export const markRetentionRunCompleted = E.fn(function* (id: Id<"retentionRuns">, { now }: WithNow) {
  yield* patchRetentionRun(id, { finishedAt: now, status: "completed" });
});
