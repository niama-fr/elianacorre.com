import { FunctionImpl, GroupImpl } from "@confect/server";
import type { WorkflowId } from "@convex-dev/workflow";
import { getStatus, start } from "@convex-dev/workflow";
import { Effect as E, Layer as L, Option as O } from "effect";

import { internal } from "../convex/_generated/api";
import {
  createRetentionRun,
  getRetentionRun,
  markRetentionRunCompleted,
  markRetentionRunFailed,
  patchRetentionRun,
  takeRecentRetentionRuns,
} from "../data/retention-runs";
import { enforcePrivacyRetentionBatch } from "../features/privacy-retention";
import { currentAdminLayer } from "../infra/current-profile";
import { components } from "./_generated/components";
import databaseSchema from "./_generated/schema";
import { MutationCtx, QueryCtx } from "./_generated/services";
import { workflow } from "./retention";
import spec from "./retention.spec";

// WORKFLOW --------------------------------------------------------------------------------------------------------------------------------
const workflowImpl = FunctionImpl.make(databaseSchema, spec, "workflow", workflow);

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
const listRecentRuns = FunctionImpl.make(databaseSchema, spec, "listRecentRuns", () =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;
    return yield* takeRecentRetentionRuns(20).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
const completeRun = FunctionImpl.make(databaseSchema, spec, "completeRun", ({ retentionRunId }) =>
  E.gen(function* () {
    const run = yield* getRetentionRun(retentionRunId);
    if (O.isNone(run) || run.value.status !== "running") return null;
    yield* markRetentionRunCompleted(retentionRunId, { now: Date.now() });
    return null;
  })
);

const failRun = FunctionImpl.make(databaseSchema, spec, "failRun", ({ phase, retentionRunId }) =>
  E.gen(function* () {
    const run = yield* getRetentionRun(retentionRunId);
    if (O.isNone(run) || run.value.status !== "running") return null;
    yield* markRetentionRunFailed(retentionRunId, { now: Date.now(), phase });
    return null;
  })
);

const runBatch = FunctionImpl.make(databaseSchema, spec, "runBatch", ({ cursor, now, phase, retentionRunId }) =>
  E.gen(function* () {
    const run = yield* getRetentionRun(retentionRunId);
    if (O.isNone(run) || run.value.status !== "running") return yield* E.die(new Error("RETENTION_RUN_NOT_RUNNING"));
    const result = yield* enforcePrivacyRetentionBatch({ cursor, now, phase });

    yield* patchRetentionRun(retentionRunId, {
      anonymizedFormerProfiles: run.value.anonymizedFormerProfiles + result.anonymizedFormerProfiles,
      anonymizedPendingProfiles: run.value.anonymizedPendingProfiles + result.anonymizedPendingProfiles,
      deletedDownloads: run.value.deletedDownloads + result.deletedDownloads,
      deletedTechnicalLogs: run.value.deletedTechnicalLogs + result.deletedTechnicalLogs,
    });

    return result;
  })
);

const startRun = FunctionImpl.make(databaseSchema, spec, "startRun", () =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;
    const now = Date.now();
    const recentRuns = yield* takeRecentRetentionRuns(20);
    const runningRun = recentRuns.find(({ status }) => status === "running");

    if (runningRun?.workflowId) {
      const workflowStatus = yield* E.promise(async () => await getStatus(ctx, components.workflow, runningRun.workflowId as WorkflowId));

      if (workflowStatus.type === "inProgress") return runningRun._id;

      if (workflowStatus.type === "completed") {
        yield* markRetentionRunCompleted(runningRun._id, { now });
        return runningRun._id;
      }

      yield* patchRetentionRun(runningRun._id, {
        failedAt: now,
        status: "failed",
      });
    } else if (runningRun)
      yield* patchRetentionRun(runningRun._id, {
        failedAt: now,
        status: "failed",
      });

    const retentionRunId = yield* createRetentionRun();

    const workflowId = yield* E.promise(
      async (): Promise<WorkflowId> =>
        await start(ctx, internal.retention.workflow, {
          now,
          retentionRunId,
        })
    );

    yield* patchRetentionRun(retentionRunId, { workflowId });

    return retentionRunId;
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(
  L.provide(workflowImpl),
  L.provide(listRecentRuns),
  L.provide(completeRun),
  L.provide(failRun),
  L.provide(runBatch),
  L.provide(startRun),
  GroupImpl.finalize
);
