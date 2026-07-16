import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { RetentionRuns } from "@ec/domain/schemas/retention-runs";
import type { WithNow } from "@ec/domain/schemas/utils";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getRetentionRun = async (ctx: QueryCtx, id: Id<"retentionRuns">) => await ctx.db.get("retentionRuns", id);

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const takeRecentRetentionRuns = async (ctx: QueryCtx, limit: number) =>
  await ctx.db.query("retentionRuns").order("desc").take(limit);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createRetentionRun = async (ctx: MutationCtx) =>
  await ctx.db.insert("retentionRuns", {
    anonymizedFormerProfiles: 0,
    anonymizedPendingProfiles: 0,
    deletedDownloads: 0,
    deletedTechnicalLogs: 0,
    failedAt: null,
    failurePhase: null,
    finishedAt: null,
    status: "running",
    workflowId: null,
  });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchRetentionRun = async (ctx: MutationCtx, id: Id<"retentionRuns">, patch: Partial<RetentionRuns["Fields"]>) => {
  await ctx.db.patch("retentionRuns", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------

export const markRetentionRunFailed = async (ctx: MutationCtx, id: Id<"retentionRuns">, { now, phase }: FailedOpts) => {
  await patchRetentionRun(ctx, id, { failedAt: now, failurePhase: phase, status: "failed" });
};
type FailedOpts = WithNow<{ phase: RetentionRuns["FailurePhase"] }>;

export const markRetentionRunCompleted = async (ctx: MutationCtx, id: Id<"retentionRuns">, { now }: WithNow) => {
  await patchRetentionRun(ctx, id, { finishedAt: now, status: "completed" });
};
