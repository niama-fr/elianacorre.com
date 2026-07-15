import { zPrivacyAuditVerificationCreate } from "@ec/domain/schemas/privacy-audits";
import { zCanonicalEmail, zConfirmedEmailPayload } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
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
import { createNewsletterPortabilityExport, enforceNewsletterRetentionBatch } from "../business/retention";
import { deletePrivacyGrant } from "../data/privacy-grants";
import { internal } from "./_generated/api";
import { zAdminMutation, zAdminQuery, zInternalAction, zInternalMutation } from "./zod";

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
    const resumableRun = recentRuns.find(({ status }) => status !== "completed");
    if (resumableRun) {
      if (resumableRun.status === "running") return resumableRun._id;
      await ctx.db.patch(resumableRun._id, { failedAt: null, failurePhase: null, status: "running" });
      await ctx.scheduler.runAfter(0, internal.privacy.runRetentionStep, {
        cursor: resumableRun.nextCursor,
        now: resumableRun.startedAt,
        phase: resumableRun.nextPhase,
        retentionRunId: resumableRun._id,
      });
      return resumableRun._id;
    }
    const retentionRunId = await ctx.db.insert("retentionRuns", {
      anonymizedFormerProfiles: 0,
      anonymizedPendingProfiles: 0,
      deletedDownloads: 0,
      deletedTechnicalLogs: 0,
      failedAt: null,
      failurePhase: null,
      finishedAt: null,
      nextCursor: null,
      nextPhase: "tasks",
      startedAt: now,
      status: "running",
    });
    await ctx.scheduler.runAfter(0, internal.privacy.runRetentionStep, {
      cursor: null,
      now,
      phase: "tasks",
      retentionRunId,
    });
    return retentionRunId;
  },
});

export const continueRetention = zInternalMutation({
  args: {
    cursor: z.string().nullable(),
    now: z.number(),
    phase: z.enum(["tasks", "webhooks", "downloads", "profiles"]),
    retentionRunId: zid("retentionRuns"),
  },
  handler: async (ctx, { cursor, now, phase, retentionRunId }) => {
    const run = await ctx.db.get(retentionRunId);
    if (!run || run.status !== "running" || run.nextPhase !== phase || run.nextCursor !== cursor) return;
    const result = await enforceNewsletterRetentionBatch(ctx, { cursor, now, phase });
    await ctx.db.patch(retentionRunId, {
      anonymizedFormerProfiles: run.anonymizedFormerProfiles + result.anonymizedFormerProfiles,
      anonymizedPendingProfiles: run.anonymizedPendingProfiles + result.anonymizedPendingProfiles,
      deletedDownloads: run.deletedDownloads + result.deletedDownloads,
      deletedTechnicalLogs: run.deletedTechnicalLogs + result.deletedTechnicalLogs,
      nextCursor: result.cursor,
      nextPhase: result.phase,
      ...(result.done ? { finishedAt: Date.now(), status: "completed" as const } : {}),
    });
    if (!result.done)
      await ctx.scheduler.runAfter(0, internal.privacy.runRetentionStep, {
        cursor: result.cursor,
        now,
        phase: result.phase,
        retentionRunId,
      });
  },
});

export const markRetentionFailed = zInternalMutation({
  args: { phase: z.enum(["tasks", "webhooks", "downloads", "profiles"]), retentionRunId: zid("retentionRuns") },
  handler: async (ctx, { phase, retentionRunId }) => {
    const run = await ctx.db.get(retentionRunId);
    if (!run || run.status !== "running" || run.nextPhase !== phase) return;
    await ctx.db.patch(retentionRunId, { failedAt: Date.now(), failurePhase: phase, status: "failed" });
  },
});

export const runRetentionStep = zInternalAction({
  args: {
    cursor: z.string().nullable(),
    now: z.number(),
    phase: z.enum(["tasks", "webhooks", "downloads", "profiles"]),
    retentionRunId: zid("retentionRuns"),
  },
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.privacy.continueRetention, args);
    } catch {
      await ctx.runMutation(internal.privacy.markRetentionFailed, { phase: args.phase, retentionRunId: args.retentionRunId });
    }
  },
});
