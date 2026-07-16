import { getStatus, start, type WorkflowId } from "@convex-dev/workflow";
import { zPrivacyAuditVerificationCreate } from "@ec/domain/schemas/privacy-audits";
import { zCanonicalEmail, zConfirmedEmailPayload } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { v } from "convex/values";
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
import {
  createNewsletterPortabilityExport,
  enforceNewsletterRetentionBatch,
  type RetentionBatchResult,
  type RetentionPhase,
} from "../business/retention";
import { deletePrivacyGrant } from "../data/privacy-grants";
import { components, internal } from "./_generated/api";
import { workflow } from "./workflow";
import { zAdminMutation, zAdminQuery, zInternalMutation } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const inspectSubject = zAdminQuery({
  args: { email: zCanonicalEmail },
  handler: async (ctx, { email }) => await inspectPrivacySubject(ctx, email),
});

export const exportNewsletter = zAdminQuery({
  args: { format: z.enum(["csv", "json"]) },
  handler: async (ctx, { format }) => await createNewsletterPortabilityExport(ctx, format),
});

export const listRetentionRuns = zAdminQuery({
  args: {},
  handler: async (ctx) => await ctx.db.query("retentionRuns").withIndex("by_started_at").order("desc").take(20),
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
  args: zPrivacyAuditVerificationCreate.omit({ performedBy: true }),
  handler: async (ctx, payload) => await processPrivacyVerification(ctx, payload),
});

// WORKFLOWS -------------------------------------------------------------------------------------------------------------------------------
type RetentionWorkflowOperations = {
  markCompleted: () => Promise<unknown>;
  markFailed: (phase: RetentionPhase) => Promise<unknown>;
  runBatch: (options: { cursor: string | null; phase: RetentionPhase; stepNumber: number }) => Promise<RetentionBatchResult>;
};

export const executeRetentionWorkflow = async ({ markCompleted, markFailed, runBatch }: RetentionWorkflowOperations) => {
  let cursor: string | null = null;
  let phase: RetentionPhase = "tasks";
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
};

export const retentionWorkflow = workflow
  .define({ args: { now: v.number(), retentionRunId: v.id("retentionRuns") } })
  .handler(async (step, { now, retentionRunId }) => {
    await executeRetentionWorkflow({
      markCompleted: async () =>
        await step.runMutation(internal.privacy.markRetentionCompleted, { retentionRunId }, { name: "mark retention completed" }),
      markFailed: async (phase) =>
        await step.runMutation(internal.privacy.markRetentionFailed, { phase, retentionRunId }, { name: "mark retention failed" }),
      runBatch: async ({ cursor, phase, stepNumber }) =>
        await step.runMutation(
          internal.privacy.runRetentionBatch,
          { cursor, now, phase, retentionRunId },
          { name: `retention ${phase} batch ${stepNumber}` }
        ),
    });
  });

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const expireGrant = zInternalMutation({
  args: { privacyGrantId: zid("privacyGrants") },
  handler: async (ctx, { privacyGrantId }) => {
    await deletePrivacyGrant(ctx, privacyGrantId);
  },
});

export const startRetention = zInternalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const recentRuns = await ctx.db.query("retentionRuns").withIndex("by_started_at").order("desc").take(20);
    const runningRun = recentRuns.find(({ status }) => status === "running");
    if (runningRun?.workflowId) {
      const workflowStatus = await getStatus(ctx, components.workflow, runningRun.workflowId as WorkflowId);
      if (workflowStatus.type === "inProgress") return runningRun._id;
      if (workflowStatus.type === "completed") {
        await ctx.db.patch(runningRun._id, { finishedAt: now, status: "completed" });
        return runningRun._id;
      }
      await ctx.db.patch(runningRun._id, { failedAt: now, status: "failed" });
    } else if (runningRun) await ctx.db.patch(runningRun._id, { failedAt: now, status: "failed" });
    const retentionRunId = await ctx.db.insert("retentionRuns", {
      anonymizedFormerProfiles: 0,
      anonymizedPendingProfiles: 0,
      deletedDownloads: 0,
      deletedTechnicalLogs: 0,
      failedAt: null,
      failurePhase: null,
      finishedAt: null,
      startedAt: now,
      status: "running",
      workflowId: null,
    });
    const workflowId = await start(ctx, internal.privacy.retentionWorkflow, { now, retentionRunId });
    await ctx.db.patch(retentionRunId, { workflowId });
    return retentionRunId;
  },
});

export const runRetentionBatch = zInternalMutation({
  args: {
    cursor: z.string().nullable(),
    now: z.number(),
    phase: z.enum(["tasks", "webhooks", "downloads", "profiles"]),
    retentionRunId: zid("retentionRuns"),
  },
  handler: async (ctx, { cursor, now, phase, retentionRunId }) => {
    const run = await ctx.db.get(retentionRunId);
    if (!run || run.status !== "running") throw new Error("RETENTION_RUN_NOT_RUNNING");
    const result = await enforceNewsletterRetentionBatch(ctx, { cursor, now, phase });
    await ctx.db.patch(retentionRunId, {
      anonymizedFormerProfiles: run.anonymizedFormerProfiles + result.anonymizedFormerProfiles,
      anonymizedPendingProfiles: run.anonymizedPendingProfiles + result.anonymizedPendingProfiles,
      deletedDownloads: run.deletedDownloads + result.deletedDownloads,
      deletedTechnicalLogs: run.deletedTechnicalLogs + result.deletedTechnicalLogs,
    });
    return result;
  },
});

export const markRetentionCompleted = zInternalMutation({
  args: { retentionRunId: zid("retentionRuns") },
  handler: async (ctx, { retentionRunId }) => {
    const run = await ctx.db.get(retentionRunId);
    if (!run || run.status !== "running") return;
    await ctx.db.patch(retentionRunId, { finishedAt: Date.now(), status: "completed" });
  },
});

export const markRetentionFailed = zInternalMutation({
  args: { phase: z.enum(["tasks", "webhooks", "downloads", "profiles"]), retentionRunId: zid("retentionRuns") },
  handler: async (ctx, { phase, retentionRunId }) => {
    const run = await ctx.db.get(retentionRunId);
    if (!run || run.status !== "running") return;
    await ctx.db.patch(retentionRunId, { failedAt: Date.now(), failurePhase: phase, status: "failed" });
  },
});
