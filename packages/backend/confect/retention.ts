import { internal } from "@ec/backend/api";
import { v } from "convex/values";
import { Effect as E } from "effect";

import { executeRetentionWorkflow } from "../business/privacy-retention";
import { workflowManager } from "./workflow";

// WORKFLOWS -------------------------------------------------------------------------------------------------------------------------------
export const workflow = workflowManager
  .define({
    args: { now: v.number(), retentionRunId: v.id("retentionRuns") },
  })
  .handler(async (step, { now, retentionRunId }): Promise<void> => {
    await E.runPromise(
      executeRetentionWorkflow({
        markCompleted: () =>
          E.promise(
            async () => await step.runMutation(internal.retention.completeRun, { retentionRunId }, { name: "mark retention completed" })
          ),
        markFailed: (phase) =>
          E.promise(
            async () => await step.runMutation(internal.retention.failRun, { phase, retentionRunId }, { name: "mark retention failed" })
          ),
        runBatch: ({ cursor, phase, stepNumber }) =>
          E.promise(
            async () =>
              await step.runMutation(
                internal.retention.runBatch,
                { cursor, now, phase, retentionRunId },
                { name: `retention ${phase} batch ${stepNumber}` }
              )
          ),
      })
    );
  });
