import { FunctionSpec, GroupSpec } from "@confect/core";
import { LoopsTaskNotFailed, LoopsTaskNotFound } from "@ec/domain/errors/loops-tasks";
import { sAuthError } from "@ec/domain/schemas/auth";
import { sLoopsTaskFailure, sLoopsTaskKind } from "@ec/domain/schemas/loops-tasks";
import { sLoopsWebhookCreate } from "@ec/domain/schemas/loops-webhooks";
import { Schema as S } from "effect";

import { Id } from "./_generated/id";
import loopsTasks from "./_generated/tables/loopsTasks";
import profiles from "./_generated/tables/profiles";
import type { run } from "./loops";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({}),
      error: () => sAuthError,
      name: "listFailedTasks",
      returns: () =>
        S.Array(
          S.Struct({
            _creationTime: S.Finite,
            _id: Id("loopsTasks"),
            acknowledgedAt: S.NullOr(S.Int),
            failure: sLoopsTaskFailure,
            finishedAt: S.Int,
            kind: sLoopsTaskKind,
            replayCount: S.Natural,
            workflowIds: S.Array(S.String),
          })
        ),
    })
  )
  // MUTATIONS -----------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => S.Struct({ loopsTaskId: Id("loopsTasks") }),
      error: () => S.Union([sAuthError, LoopsTaskNotFound, LoopsTaskNotFailed]),
      name: "acknowledgeFailedTask",
      returns: () => S.Null,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => S.Struct({ loopsTaskId: Id("loopsTasks") }),
      error: () => S.Union([sAuthError, LoopsTaskNotFound, LoopsTaskNotFailed]),
      name: "replayFailedTask",
      returns: () => S.String,
    })
  )
  // INTERNAL QUERIES ----------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.internalQuery({
      args: () => S.Struct({ loopsTaskId: Id("loopsTasks") }),
      name: "getExecutionPayload",
      returns: () => S.NullOr(S.Struct({ profile: S.NullOr(profiles.Doc), task: loopsTasks.Doc })),
    })
  )
  .addFunction(
    FunctionSpec.internalQuery({
      args: () => S.Struct({ loopsTaskId: Id("loopsTasks") }),
      name: "getTaskKind",
      returns: () => sLoopsTaskKind,
    })
  )
  // INTERNAL MUTATIONS --------------------------------------------------------------------------------------------------------------------
  .addFunction(FunctionSpec.convexInternalMutation<typeof run>()("run"))
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => S.Struct({ failure: sLoopsTaskFailure, loopsTaskId: Id("loopsTasks") }),
      name: "markTaskFailed",
      returns: () => S.Null,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => S.Struct({ loopsTaskId: Id("loopsTasks") }),
      name: "markTaskSucceeded",
      returns: () => S.Null,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => sLoopsWebhookCreate,
      name: "processWebhook",
      returns: () => S.Null,
    })
  )
  // INTERNAL ACTIONS ----------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.internalAction({
      args: () => S.Struct({ loopsTaskId: Id("loopsTasks") }),
      name: "execute",
      returns: () =>
        S.Union([
          S.Struct({ failure: S.Null, status: S.Literal("succeeded") }),
          S.Struct({ failure: sLoopsTaskFailure, status: S.Literal("failed") }),
        ]),
    })
  );
