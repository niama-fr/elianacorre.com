import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import type { WithNow } from "@ec/domain/schemas/utils";
import type { PaginationOptions } from "convex/server";
import { ConvexError } from "convex/values";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getLoopsTask = async (ctx: QueryCtx, id: Id<"loopsTasks">) => await ctx.db.get("loopsTasks", id);

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

export const takeFailedLoopsTasks = async (ctx: QueryCtx, limit: number) =>
  await ctx.db
    .query("loopsTasks")
    .withIndex("by_status_and_finished_at", (q) => q.eq("status", "failed"))
    .order("desc")
    .take(limit);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createLoopsTask = async (ctx: MutationCtx, create: LoopsTasks["Create"]) =>
  await ctx.db.insert("loopsTasks", {
    ...create,
    acknowledgedAt: null,
    alertedAt: null,
    error: null,
    failureCategory: null,
    failureCode: null,
    failureStatus: null,
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

// DELETE -----------------------------------------------------------------------------------------------------------------------------------
export const deleteLoopsTask = async (ctx: MutationCtx, id: Id<"loopsTasks">) => {
  await ctx.db.delete("loopsTasks", id);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markLoopsTaskFailed = async (ctx: MutationCtx, task: TaskRef, { failure, now }: WithNow<MarkFailedOpts>) => {
  await patchLoopsTask(ctx, task._id, {
    acknowledgedAt: null,
    alertedAt: now,
    error: failure.category,
    failureCategory: failure.category,
    failureCode: failure.code,
    failureStatus: failure.status,
    finishedAt: now,
    status: "failed",
  });
};

export const markLoopsTaskSucceeded = async (ctx: MutationCtx, task: TaskRef, { now }: WithNow) => {
  const extra = task.kind === "deleteContact" ? { email: null } : {};
  await patchLoopsTask(ctx, task._id, { error: null, finishedAt: now, status: "succeeded", ...extra });
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type TaskRef = Pick<LoopsTasks["Doc"], "_id" | "kind">;
type MarkFailedOpts = {
  failure: {
    category: NonNullable<LoopsTasks["CommonFields"]["failureCategory"]>;
    code: NonNullable<LoopsTasks["CommonFields"]["failureCode"]>;
    status: number | null;
  };
};
