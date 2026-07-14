import { isLoopsTaskPending } from "@ec/domain/helpers/loops-tasks";
import type { LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import { zLoopsWebhookCreate } from "@ec/domain/schemas/loops-webhooks";
import type { Profiles } from "@ec/domain/schemas/profiles";
import { zid } from "convex-helpers/server/zod4";
import { ConvexError, v } from "convex/values";
import z from "zod";

import { executeLoopsTask } from "../business/loops";
import { processNewsletterProviderWebhook } from "../business/newsletter";
import { getLoopsTask, markLoopsTaskFailed, markLoopsTaskSucceeded } from "../data/loops-tasks";
import { getProfile } from "../data/profiles";
import { internal } from "./_generated/api";
import { workflow } from "./workflow";
import { zInternalAction, zInternalMutation, zInternalQuery } from "./zod";

// WORKFLOWS -------------------------------------------------------------------------------------------------------------------------------
export const run = workflow.define({ args: { loopsTaskId: v.id("loopsTasks") } }).handler(async (step, { loopsTaskId }) => {
  try {
    await step.runAction(internal.loops.execute, { loopsTaskId }, { name: "execute Loops task", retry: true });
    await step.runMutation(internal.loops.markTaskSucceeded, { loopsTaskId }, { name: "mark Loops task as succeeded" });
  } catch (unknownError) {
    const error = unknownError instanceof Error ? unknownError.message : "Unknown Loops workflow error";
    await step.runMutation(internal.loops.markTaskFailed, { error, loopsTaskId }, { name: "mark Loops task as failed" });
  }
});

// INTERNAL QUERIES ------------------------------------------------------------------------------------------------------------------------
export const getExecutionPayload = zInternalQuery({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }): Promise<{ profile: Profiles["Doc"]; task: LoopsTasks["Doc"] } | null> => {
    const task = await getLoopsTask(ctx, loopsTaskId);
    if (!task) throw new ConvexError("UNKNOWN_LOOPS_TASK");
    if (task.status === "succeeded") return null;
    if (task.status === "failed") throw new ConvexError("LOOPS_TASK_ALREADY_FAILED");

    const profile = await getProfile(ctx, task.profileId);
    if (!profile) throw new ConvexError("LOOPS_TASK_PROFILE_NOT_FOUND");

    return { profile, task };
  },
});

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const markTaskFailed = zInternalMutation({
  args: { error: z.string(), loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { error, loopsTaskId }) => {
    const task = await getLoopsTask(ctx, loopsTaskId);
    if (!isLoopsTaskPending(task)) return;
    await markLoopsTaskFailed(ctx, loopsTaskId, { error, now: Date.now() });
  },
});

export const markTaskSucceeded = zInternalMutation({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }) => {
    const task = await getLoopsTask(ctx, loopsTaskId);
    if (!isLoopsTaskPending(task)) return;
    await markLoopsTaskSucceeded(ctx, loopsTaskId, { now: Date.now() });
  },
});

export const processWebhook = zInternalMutation({
  args: zLoopsWebhookCreate,
  handler: async (ctx, create) => {
    await processNewsletterProviderWebhook(ctx, create);
  },
});

// INTERNAL ACTIONS ------------------------------------------------------------------------------------------------------------------------
export const execute = zInternalAction({
  args: { loopsTaskId: zid("loopsTasks") },
  handler: async (ctx, { loopsTaskId }): Promise<void> => {
    const payload = await ctx.runQuery(internal.loops.getExecutionPayload, { loopsTaskId });
    if (payload) await executeLoopsTask(ctx, payload);
  },
});
