import type { WorkflowArgs, WorkflowMutationResult } from "@convex-dev/workflow";
import { classifyLoopsTaskFailure, getLoopsTaskRetryPolicy } from "@ec/domain/helpers/loops-tasks";
import type { RegisteredMutation } from "convex/server";
import { v } from "convex/values";

import { internal } from "../convex/_generated/api";
import { workflowManager } from "./workflow";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const runArgs = { loopsTaskId: v.id("loopsTasks") };

// WORKFLOWS -------------------------------------------------------------------------------------------------------------------------------
export const run: RegisteredMutation<"internal", WorkflowArgs<typeof runArgs>, WorkflowMutationResult> = workflowManager
  .define({
    args: { loopsTaskId: v.id("loopsTasks") },
  })
  .handler(async (step, { loopsTaskId }): Promise<void> => {
    try {
      const kind = await step.runQuery(internal.loops.getTaskKind, { loopsTaskId }, { name: "get Loops task retry policy" });

      const result = await step.runAction(
        internal.loops.execute,
        { loopsTaskId },
        { name: "execute Loops task", retry: getLoopsTaskRetryPolicy(kind) }
      );

      await (result.status === "failed"
        ? step.runMutation(internal.loops.markTaskFailed, { failure: result.failure, loopsTaskId }, { name: "alert Loops task failure" })
        : step.runMutation(internal.loops.markTaskSucceeded, { loopsTaskId }, { name: "mark Loops task as succeeded" }));
    } catch (error) {
      const failure = classifyLoopsTaskFailure(error);

      await step.runMutation(internal.loops.markTaskFailed, { failure, loopsTaskId }, { name: "alert Loops task failure" });
    }
  });
