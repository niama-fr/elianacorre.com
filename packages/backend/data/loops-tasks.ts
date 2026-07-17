import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { type LoopsTasks, zLoopsTaskDoc } from "@ec/domain/schemas/loops-tasks";
import type { WithNow } from "@ec/domain/schemas/utils";
import type { PaginationOptions } from "convex/server";
import { ConvexError } from "convex/values";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getLoopsTask = async (ctx: QueryCtx, id: Id<"loopsTasks">): Promise<LoopsTasks["Doc"] | null> => {
  const task = await ctx.db.get("loopsTasks", id);
  return task === null ? null : zLoopsTaskDoc.parse(task);
};

export const getLoopsTaskByEbookDownload = async (ctx: QueryCtx, downloadId: Id<"ebookDownloads">) =>
  await ctx.db
    .query("loopsTasks")
    .withIndex("by_ebook_download_id", (q) => q.eq("ebookDownloadId", downloadId))
    .unique();

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireLoopsTask = async (ctx: QueryCtx, id: Id<"loopsTasks">) => {
  const doc = await getLoopsTask(ctx, id);
  if (!doc) throw new ConvexError("UNKNOWN_LOOPS_TASK");
  return doc;
};

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateExpiredLoopsTasks = async (ctx: MutationCtx, pagination: PaginationOptions, before: number) =>
  await ctx.db
    .query("loopsTasks")
    .withIndex("by_finished_at", (q) => q.lte("finishedAt", before))
    .paginate(pagination);

export const takeProfileLoopsTasks = async (ctx: QueryCtx, limit: number, profileId: Id<"profiles">) =>
  await ctx.db
    .query("loopsTasks")
    .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
    .take(limit);

export const takeFailedLoopsTasks = async (ctx: QueryCtx, limit: number) => {
  const tasks = await ctx.db
    .query("loopsTasks")
    .withIndex("by_status_and_finished_at", (q) => q.eq("status", "failed"))
    .order("desc")
    .take(limit);
  return tasks.map((task): FailedTask => {
    const parsed = zLoopsTaskDoc.parse(task);
    if (parsed.status !== "failed") throw new ConvexError("LOOPS_TASK_INVALID_FAILED_STATE");
    return parsed;
  });
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createLoopsTask = async (ctx: MutationCtx, create: LoopsTasks["Create"]) =>
  await ctx.db.insert("loopsTasks", {
    ...create,
    acknowledgedAt: null,
    failure: null,
    finishedAt: null,
    replayCount: 0,
    status: "pending",
    workflowId: null,
    workflowIds: [],
  });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchLoopsTask = async (ctx: MutationCtx, id: Id<"loopsTasks">, patch: Partial<LoopsTasks["Fields"]>) => {
  await ctx.db.patch("loopsTasks", id, patch);
};

export const assignLoopsTaskWorkflow = async (ctx: MutationCtx, id: Id<"loopsTasks">, workflowId: string) => {
  await patchLoopsTask(ctx, id, { workflowId, workflowIds: [workflowId] });
};

export const setLoopsTaskAcknowledgedAt = async (ctx: MutationCtx, id: Id<"loopsTasks">, now: number) => {
  await ctx.db.patch(id, { acknowledgedAt: now });
};

// DELETE -----------------------------------------------------------------------------------------------------------------------------------
export const deleteLoopsTask = async (ctx: MutationCtx, id: Id<"loopsTasks">) => {
  await ctx.db.delete("loopsTasks", id);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markLoopsTaskFailed = async (ctx: MutationCtx, task: TaskRef, { failure, now }: WithNow<MarkFailedOpts>) => {
  await patchLoopsTask(ctx, task._id, {
    acknowledgedAt: null,
    failure,
    finishedAt: now,
    status: "failed",
  });
};

export const markLoopsTaskSucceeded = async (ctx: MutationCtx, task: TaskRef, { now }: WithNow) => {
  const extra = task.kind === "deleteContact" ? { email: null } : {};
  await patchLoopsTask(ctx, task._id, { finishedAt: now, status: "succeeded", ...extra });
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type FailedTask = Extract<LoopsTasks["Doc"], { status: "failed" }>;
type TaskRef = Pick<Extract<LoopsTasks["Doc"], { status: "pending" }>, "_id" | "kind">;
type MarkFailedOpts = {
  failure: NonNullable<LoopsTasks["Fields"]["failure"]>;
};
