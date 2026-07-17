import { getLoopsTaskFailure, getLoopsTaskRetryPolicy, isLoopsTaskPending, type LoopsTaskFailure } from "@ec/domain/helpers/loops-tasks";
import { zLoopsTaskFailureCategory, type LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import { zLoopsWebhookCreate } from "@ec/domain/schemas/loops-webhooks";
import type { Profiles } from "@ec/domain/schemas/profiles";
import { zid } from "convex-helpers/server/zod4";
import { ConvexError, v } from "convex/values";

import { acknowledgeFailedLoopsTask, executeLoopsTask, processLoopsWebhook, replayFailedLoopsTask } from "../business/loops";
import { getLoopsTask, markLoopsTaskFailed, markLoopsTaskSucceeded, takeFailedLoopsTasks } from "../data/loops-tasks";
import { getProfile } from "../data/profiles";
import { internal } from "./_generated/api";
import { workflow } from "./workflow";
import { zAdminMutation, zAdminQuery, zInternalAction, zInternalMutation, zInternalQuery } from "./zod";

const FAILED_TASK_LIMIT = 50;

// ADMIN -----------------------------------------------------------------------------------------------------------------------------------
export const listFailedTasks = zAdminQuery({
  args: {},
  handler: async (ctx) => {
    const tasks = await takeFailedLoopsTasks(ctx, FAILED_TASK_LIMIT);
    return tasks.map(({ _creationTime, _id, acknowledgedAt, failure, finishedAt, kind, replayCount, workflowId, workflowIds }) => ({
      _creationTime,
      _id,
      acknowledgedAt,
      failure,
      finishedAt,
      kind,
      replayCount,
      workflowId,
      workflowIds,
    }));
  },
});

export const acknowledgeFailedTask = zAdminMutation({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }) => {
    await acknowledgeFailedLoopsTask(ctx, loopsTaskId, Date.now());
  },
});

export const replayFailedTask = zAdminMutation({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }): Promise<string> => {
    const task = await getLoopsTask(ctx, loopsTaskId);
    if (!task) throw new ConvexError("UNKNOWN_LOOPS_TASK");
    return await replayFailedLoopsTask(ctx, task);
  },
});

// WORKFLOWS -------------------------------------------------------------------------------------------------------------------------------
export const run = workflow.define({ args: { loopsTaskId: v.id("loopsTasks") } }).handler(async (step, { loopsTaskId }) => {
  try {
    const kind = await step.runQuery(internal.loops.getTaskKind, { loopsTaskId }, { name: "get Loops task retry policy" });
    const result = await step.runAction(
      internal.loops.execute,
      { loopsTaskId },
      { name: "execute Loops task", retry: getLoopsTaskRetryPolicy(kind) }
    );
    await (result.status === "failed"
      ? step.runMutation(
          internal.loops.markTaskFailed,
          { failure: result.failure.failure, loopsTaskId },
          { name: "alert Loops task failure" }
        )
      : step.runMutation(internal.loops.markTaskSucceeded, { loopsTaskId }, { name: "mark Loops task as succeeded" }));
  } catch (unknownError) {
    const failure = getLoopsTaskFailure(unknownError);
    await step.runMutation(internal.loops.markTaskFailed, { failure: failure.failure, loopsTaskId }, { name: "alert Loops task failure" });
  }
});

// INTERNAL QUERIES ------------------------------------------------------------------------------------------------------------------------
export const getExecutionPayload = zInternalQuery({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }): Promise<{ profile: Profiles["Doc"] | null; task: LoopsTasks["Doc"] } | null> => {
    const task = await getLoopsTask(ctx, loopsTaskId);
    if (!task) throw new ConvexError("UNKNOWN_LOOPS_TASK");
    if (task.status === "succeeded") return null;
    if (task.status === "failed") throw new ConvexError("LOOPS_TASK_ALREADY_FAILED");

    if (task.kind === "deleteContact") return { profile: null, task };

    const profile = await getProfile(ctx, task.profileId);
    if (!profile) throw new ConvexError("LOOPS_TASK_PROFILE_NOT_FOUND");

    return { profile, task };
  },
});

export const getTaskKind = zInternalQuery({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }): Promise<LoopsTasks["Kind"]> => {
    const task = await getLoopsTask(ctx, loopsTaskId);
    if (!task) throw new ConvexError("UNKNOWN_LOOPS_TASK");
    return task.kind;
  },
});

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const markTaskFailed = zInternalMutation({
  args: {
    failure: zLoopsTaskFailureCategory,
    loopsTaskId: zid("loopsTasks"),
  },
  handler: async (ctx, { failure, loopsTaskId }) => {
    const task = await getLoopsTask(ctx, loopsTaskId);
    if (!task || !isLoopsTaskPending(task)) return;
    await markLoopsTaskFailed(ctx, task, { failure, now: Date.now() });
  },
});

export const markTaskSucceeded = zInternalMutation({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }) => {
    const task = await getLoopsTask(ctx, loopsTaskId);
    if (!task || !isLoopsTaskPending(task)) return;
    await markLoopsTaskSucceeded(ctx, task, { now: Date.now() });
  },
});

export const processWebhook = zInternalMutation({
  args: zLoopsWebhookCreate,
  handler: async (ctx, create) => {
    await processLoopsWebhook(ctx, create);
  },
});

// INTERNAL ACTIONS ------------------------------------------------------------------------------------------------------------------------
export const execute = zInternalAction({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }): Promise<TaskExecutionResult> => {
    const payload = await ctx.runQuery(internal.loops.getExecutionPayload, { loopsTaskId });
    if (!payload) return { status: "succeeded" };

    try {
      await executeLoopsTask(ctx, payload);
      return { status: "succeeded" };
    } catch (error) {
      const failure = getLoopsTaskFailure(error);
      if (failure.retryable) throw error;
      return { failure, status: "failed" };
    }
  },
});

type TaskExecutionResult = { status: "succeeded" } | { failure: LoopsTaskFailure; status: "failed" };
