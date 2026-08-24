import { FunctionImpl, GroupImpl } from "@confect/server";
import { classifyLoopsTaskFailure, isLoopsTaskPending, isLoopsTaskRetryable } from "@ec/domain/helpers/loops-tasks";
import { Cause as C, Effect as E, Layer as L, Option as O } from "effect";

import { getLoopsTask, markLoopsTaskFailed, markLoopsTaskSucceeded, requireLoopsTask, takeFailedLoopsTasks } from "../data/loops-tasks";
import { getNewsConfirmation } from "../data/news-confirmations";
import { getProfile } from "../data/profiles";
import {
  acknowledgeFailedLoopsTask,
  executeLoopsTask,
  processLoopsWebhook as processLoopsWebhookBusiness,
  replayFailedLoopsTask,
} from "../features/loops";
import { currentAdminLayer } from "../infra/current-profile";
import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import { MutationCtx, QueryCtx, QueryRunner } from "./_generated/services";
import { run } from "./loops";
import spec from "./loops.spec";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const FAILED_TASK_LIMIT = 50;

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
const listFailedTasks = FunctionImpl.make(databaseSchema, spec, "listFailedTasks", () =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;

    return yield* takeFailedLoopsTasks(FAILED_TASK_LIMIT).pipe(
      E.map((tasks) =>
        tasks.map(({ _creationTime, _id, acknowledgedAt, failure, finishedAt, kind, replayCount, workflowIds }) => ({
          _creationTime,
          _id,
          acknowledgedAt,
          failure,
          finishedAt,
          kind,
          replayCount,
          workflowIds,
        }))
      ),
      E.provide(currentAdminLayer(ctx))
    );
  })
);

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
const acknowledgeFailedTask = FunctionImpl.make(databaseSchema, spec, "acknowledgeFailedTask", ({ loopsTaskId }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;

    return yield* acknowledgeFailedLoopsTask(loopsTaskId, Date.now()).pipe(E.as(null), E.provide(currentAdminLayer(ctx)));
  })
);

const replayFailedTask = FunctionImpl.make(databaseSchema, spec, "replayFailedTask", ({ loopsTaskId }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;

    return yield* E.gen(function* () {
      const task = yield* requireLoopsTask(loopsTaskId);
      return yield* replayFailedLoopsTask(task);
    }).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

// INTERNAL QUERIES ------------------------------------------------------------------------------------------------------------------------
const getExecutionPayload = FunctionImpl.make(databaseSchema, spec, "getExecutionPayload", ({ loopsTaskId }) =>
  E.gen(function* () {
    const task = yield* getLoopsTask(loopsTaskId);

    if (O.isNone(task)) return yield* E.die(new Error("UNKNOWN_LOOPS_TASK"));
    if (task.value.status === "succeeded") return null;
    if (task.value.status === "failed") return yield* E.die(new Error("LOOPS_TASK_ALREADY_FAILED"));
    if (task.value.kind === "deleteContact") return { profile: null, task: task.value };
    if (task.value.kind === "sendConfirmationEmail" && O.isNone(yield* getNewsConfirmation(task.value.newsConfirmationId))) return null;

    const profile = yield* getProfile(task.value.profileId);

    if (O.isNone(profile)) return yield* E.die(new Error("LOOPS_TASK_PROFILE_NOT_FOUND"));

    return { profile: profile.value, task: task.value };
  })
);

const getTaskKind = FunctionImpl.make(databaseSchema, spec, "getTaskKind", ({ loopsTaskId }) =>
  E.gen(function* () {
    const task = yield* getLoopsTask(loopsTaskId);

    if (O.isNone(task)) return yield* E.die(new Error("UNKNOWN_LOOPS_TASK"));

    return task.value.kind;
  })
);

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
const runImpl = FunctionImpl.make(databaseSchema, spec, "run", run);

const markTaskFailed = FunctionImpl.make(databaseSchema, spec, "markTaskFailed", ({ failure, loopsTaskId }) =>
  E.gen(function* () {
    const task = yield* getLoopsTask(loopsTaskId);

    if (O.isNone(task) || !isLoopsTaskPending(task.value)) return null;

    yield* markLoopsTaskFailed(task.value, { failure, now: Date.now() });

    return null;
  })
);

const markTaskSucceeded = FunctionImpl.make(databaseSchema, spec, "markTaskSucceeded", ({ loopsTaskId }) =>
  E.gen(function* () {
    const task = yield* getLoopsTask(loopsTaskId);

    if (O.isNone(task) || !isLoopsTaskPending(task.value)) return null;

    yield* markLoopsTaskSucceeded(task.value, { now: Date.now() });

    return null;
  })
);

const processWebhook = FunctionImpl.make(databaseSchema, spec, "processWebhook", (create) =>
  processLoopsWebhookBusiness(create).pipe(E.orDie, E.as(null))
);

// INTERNAL ACTIONS ------------------------------------------------------------------------------------------------------------------------
const execute = FunctionImpl.make(databaseSchema, spec, "execute", ({ loopsTaskId }) =>
  E.gen(function* () {
    const runQuery = yield* QueryRunner;

    const payload = yield* runQuery(refs.internal.loops.getExecutionPayload, { loopsTaskId }).pipe(E.orDie);

    if (payload === null) return { failure: null, status: "succeeded" } as const;

    return yield* executeLoopsTask(payload).pipe(
      E.as({ failure: null, status: "succeeded" } as const),
      E.catchCause((cause) => {
        const error = C.squash(cause);
        const failure = classifyLoopsTaskFailure(error);

        return isLoopsTaskRetryable(failure) ? E.failCause(cause) : E.succeed({ failure, status: "failed" } as const);
      })
    );
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(
  L.provide(listFailedTasks),
  L.provide(acknowledgeFailedTask),
  L.provide(replayFailedTask),
  L.provide(getExecutionPayload),
  L.provide(getTaskKind),
  L.provide(runImpl),
  L.provide(markTaskFailed),
  L.provide(markTaskSucceeded),
  L.provide(processWebhook),
  L.provide(execute),
  GroupImpl.finalize
);
