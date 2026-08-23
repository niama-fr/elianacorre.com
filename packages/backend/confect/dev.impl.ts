import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect as E, Layer as L } from "effect";

import { dieOnDecodeError } from "../data/confect";
import { deleteStorage, takeStorage } from "../data/storage";
import databaseSchema from "./_generated/schema";
import { DatabaseReader, MutationCtx } from "./_generated/services";
import spec from "./dev.spec";
import { workflowManager } from "./workflow";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const STORAGE_BATCH_SIZE = 50;

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
const prepareReset = FunctionImpl.make(databaseSchema, spec, "prepareReset", () =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;

    let canceledWorkflows = 0;
    let cursor: string | null = null;

    for (;;) {
      const page: WorkflowPage = yield* listWorkflows(ctx, cursor);

      for (const item of page.page) {
        const status = yield* E.promise(async () => await workflowManager.status(ctx, item.workflowId));
        if (status.type !== "inProgress") continue;

        yield* E.promise(async () => {
          await workflowManager.cancel(ctx, item.workflowId);
        });
        canceledWorkflows += 1;
      }

      if (page.isDone) break;

      cursor = page.continueCursor;
    }

    const db = yield* DatabaseReader;
    const scheduledFunctions = yield* db.table("_scheduled_functions").index("by_creation_time", "desc").collect().pipe(dieOnDecodeError);

    let canceledScheduledFunctions = 0;

    for (const scheduledFunction of scheduledFunctions) {
      if (scheduledFunction.state.kind !== "pending") continue;
      yield* E.promise(async () => {
        await ctx.scheduler.cancel(scheduledFunction._id);
      });
      canceledScheduledFunctions += 1;
    }

    return { canceledScheduledFunctions, canceledWorkflows };
  })
);

const deleteStorageBatch = FunctionImpl.make(databaseSchema, spec, "deleteStorageBatch", () =>
  E.gen(function* () {
    const files = yield* takeStorage(STORAGE_BATCH_SIZE);
    for (const file of files) yield* deleteStorage(file._id).pipe(E.catchTag("BlobNotFoundError", () => E.void));
    return { deleted: files.length, done: files.length < STORAGE_BATCH_SIZE };
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(prepareReset), L.provide(deleteStorageBatch), GroupImpl.finalize);

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
const listWorkflows = (ctx: MutationCtx, cursor: string | null): E.Effect<WorkflowPage> =>
  E.promise(async () => await workflowManager.list(ctx, { order: "asc", paginationOpts: { cursor, numItems: 100 } }));

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type WorkflowPage = Awaited<ReturnType<typeof workflowManager.list>>;
