import type { WorkflowId } from "@convex-dev/workflow";
import { getStatus, start } from "@convex-dev/workflow";
import { components, internal } from "@ec/backend/api";
import type { RetentionRuns } from "@ec/domain/schemas/retention-runs";
import { zRetentionRunFailurePhase } from "@ec/domain/schemas/retention-runs";
import { zid } from "convex-helpers/server/zod4";
import { v } from "convex/values";
import z from "zod";

import { enforceNewsletterRetentionBatch, type NewsletterRetentionBatchResult } from "../business/newsletter-retention";
import {
  createRetentionRun,
  getRetentionRun,
  markRetentionRunCompleted,
  markRetentionRunFailed,
  patchRetentionRun,
  takeRecentRetentionRuns,
} from "../data/retention-runs";
import { workflow as workflowManager } from "./workflow";
import { zAdminQuery, zInternalMutation } from "./zod";

// WORKFLOWS -------------------------------------------------------------------------------------------------------------------------------
export const workflow = workflowManager
  .define({ args: { now: v.number(), retentionRunId: v.id("retentionRuns") } })
  .handler(async (step, { now, retentionRunId }) => {
    await executeRetentionWorkflow({
      markCompleted: async () =>
        await step.runMutation(internal.retention.completeRun, { retentionRunId }, { name: "mark retention completed" }),
      markFailed: async (phase) =>
        await step.runMutation(internal.retention.failRun, { phase, retentionRunId }, { name: "mark retention failed" }),
      runBatch: async ({ cursor, phase, stepNumber }) =>
        await step.runMutation(
          internal.retention.runBatch,
          { cursor, now, phase, retentionRunId },
          { name: `retention ${phase} batch ${stepNumber}` }
        ),
    });
  });

export async function executeRetentionWorkflow({ markCompleted, markFailed, runBatch }: ExecuteWorkflowOpts) {
  let cursor: string | null = null;
  let phase: RetentionRuns["FailurePhase"] = "tasks";
  let stepNumber = 0;
  try {
    while (true) {
      const result = await runBatch({ cursor, phase, stepNumber });
      if (result.done) break;
      const { cursor: nextCursor, phase: nextPhase } = result;
      cursor = nextCursor;
      phase = nextPhase;
      stepNumber += 1;
    }
    await markCompleted();
  } catch (unknownError) {
    await markFailed(phase);
    throw unknownError;
  }
}
type ExecuteWorkflowOpts = {
  markCompleted: () => Promise<unknown>;
  markFailed: (phase: RetentionRuns["FailurePhase"]) => Promise<unknown>;
  runBatch: (options: {
    cursor: string | null;
    phase: RetentionRuns["FailurePhase"];
    stepNumber: number;
  }) => Promise<NewsletterRetentionBatchResult>;
};

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const listRecentRuns = zAdminQuery({
  args: {},
  handler: async (ctx) => await takeRecentRetentionRuns(ctx, 20),
});

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const completeRun = zInternalMutation({
  args: { retentionRunId: zid("retentionRuns") },
  handler: async (ctx, { retentionRunId }) => {
    const run = await getRetentionRun(ctx, retentionRunId);
    if (!run || run.status !== "running") return;
    await markRetentionRunCompleted(ctx, retentionRunId, { now: Date.now() });
  },
});

export const failRun = zInternalMutation({
  args: { phase: zRetentionRunFailurePhase, retentionRunId: zid("retentionRuns") },
  handler: async (ctx, { phase, retentionRunId }) => {
    const run = await getRetentionRun(ctx, retentionRunId);
    if (!run || run.status !== "running") return;
    await markRetentionRunFailed(ctx, retentionRunId, { now: Date.now(), phase });
  },
});

export const runBatch = zInternalMutation({
  args: {
    cursor: z.string().nullable(),
    now: z.number(),
    phase: zRetentionRunFailurePhase,
    retentionRunId: zid("retentionRuns"),
  },
  handler: async (ctx, { cursor, now, phase, retentionRunId }) => {
    const run = await getRetentionRun(ctx, retentionRunId);
    if (!run || run.status !== "running") throw new Error("RETENTION_RUN_NOT_RUNNING");
    const result = await enforceNewsletterRetentionBatch(ctx, { cursor, now, phase });
    await patchRetentionRun(ctx, retentionRunId, {
      anonymizedFormerProfiles: run.anonymizedFormerProfiles + result.anonymizedFormerProfiles,
      anonymizedPendingProfiles: run.anonymizedPendingProfiles + result.anonymizedPendingProfiles,
      deletedDownloads: run.deletedDownloads + result.deletedDownloads,
      deletedTechnicalLogs: run.deletedTechnicalLogs + result.deletedTechnicalLogs,
    });
    return result;
  },
});

export const startRun = zInternalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const recentRuns = await takeRecentRetentionRuns(ctx, 20);
    const runningRun = recentRuns.find(({ status }) => status === "running");
    if (runningRun?.workflowId) {
      const workflowStatus = await getStatus(ctx, components.workflow, runningRun.workflowId as WorkflowId);
      if (workflowStatus.type === "inProgress") return runningRun._id;
      if (workflowStatus.type === "completed") {
        await markRetentionRunCompleted(ctx, runningRun._id, { now });
        return runningRun._id;
      }
      await patchRetentionRun(ctx, runningRun._id, { failedAt: now, status: "failed" });
    } else if (runningRun) await patchRetentionRun(ctx, runningRun._id, { failedAt: now, status: "failed" });
    const retentionRunId = await createRetentionRun(ctx);
    const workflowId = await start(ctx, internal.retention.workflow, { now, retentionRunId });
    await patchRetentionRun(ctx, retentionRunId, { workflowId });
    return retentionRunId;
  },
});
