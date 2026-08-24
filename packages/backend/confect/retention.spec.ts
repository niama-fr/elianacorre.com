import { FunctionSpec, GroupSpec } from "@confect/core";
import { sAuthError } from "@ec/domain/schemas/auth";
import { sRetentionRunFailurePhase } from "@ec/domain/schemas/retention-runs";
import { Schema as S } from "effect";

import { Id } from "./_generated/id";
import retentionRuns from "./_generated/tables/retentionRuns";
import type { workflow } from "./retention";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({}),
      error: () => sAuthError,
      name: "listRecentRuns",
      returns: () => S.Array(retentionRuns.Doc),
    })
  )
  // INTERNAL MUTATIONS --------------------------------------------------------------------------------------------------------------------
  .addFunction(FunctionSpec.convexInternalMutation<typeof workflow>()("workflow"))
  .addFunction(
    FunctionSpec.internalMutation({
      args: () =>
        S.Struct({
          retentionRunId: Id("retentionRuns"),
        }),
      name: "completeRun",
      returns: () => S.Null,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      args: () =>
        S.Struct({
          phase: sRetentionRunFailurePhase,
          retentionRunId: Id("retentionRuns"),
        }),
      name: "failRun",
      returns: () => S.Null,
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      args: () =>
        S.Struct({
          cursor: S.NullOr(S.String),
          now: S.Finite,
          phase: sRetentionRunFailurePhase,
          retentionRunId: Id("retentionRuns"),
        }),
      name: "runBatch",
      returns: () =>
        S.Struct({
          anonymizedFormerProfiles: S.Natural,
          anonymizedPendingProfiles: S.Natural,
          cursor: S.NullOr(S.String),
          deletedDownloads: S.Natural,
          deletedTechnicalLogs: S.Natural,
          done: S.Boolean,
          phase: sRetentionRunFailurePhase,
        }),
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => S.Struct({}),
      name: "startRun",
      returns: () => Id("retentionRuns"),
    })
  );
