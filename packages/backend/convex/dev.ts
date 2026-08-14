import { internalMutation } from "./_generated/server";
import { workflow } from "./workflow";

// CONSTS -----------------------------------------------------------------------------------------------------------------------------------

const STORAGE_BATCH_SIZE = 50;

// RESET ------------------------------------------------------------------------------------------------------------------------------------

/**
 * Prepares the dev deployment for a destructive database reset.
 *
 * Normal application/component tables are cleared by the local reset script.
 * This mutation handles runtime state that cannot safely be removed through
 * ordinary table replacement:
 *
 * - active durable workflows;
 * - pending root scheduled functions.
 */
export const prepareReset = internalMutation({
  args: {},
  handler: async (ctx) => {
    let canceledWorkflows = 0;

    let cursor: string | null = null;

    for (;;) {
      const page = await workflow.list(ctx, {
        order: "asc",
        paginationOpts: {
          cursor,
          numItems: 100,
        },
      });

      for (const item of page.page) {
        const status = await workflow.status(ctx, item.workflowId);

        if (status.type !== "inProgress") continue;

        await workflow.cancel(ctx, item.workflowId);
        canceledWorkflows += 1;
      }

      if (page.isDone) break;

      cursor = page.continueCursor;
    }

    const scheduledFunctions = await ctx.db.system.query("_scheduled_functions").collect();

    let canceledScheduledFunctions = 0;

    for (const scheduledFunction of scheduledFunctions) {
      if (scheduledFunction.state.kind !== "pending") continue;

      await ctx.scheduler.cancel(scheduledFunction._id);
      canceledScheduledFunctions += 1;
    }

    return {
      canceledScheduledFunctions,
      canceledWorkflows,
    };
  },
});

/**
 * Deletes root Convex file storage in bounded batches.
 *
 * The local reset script repeatedly invokes this until `done` is true.
 */
export const deleteStorageBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.system.query("_storage").take(STORAGE_BATCH_SIZE);

    for (const file of files) await ctx.storage.delete(file._id);

    return {
      deleted: files.length,
      done: files.length < STORAGE_BATCH_SIZE,
    };
  },
});
