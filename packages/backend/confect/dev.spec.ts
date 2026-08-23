import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema as S } from "effect";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // INTERNAL MUTATIONS --------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => S.Struct({}),
      name: "prepareReset",
      returns: () => S.Struct({ canceledScheduledFunctions: S.Int, canceledWorkflows: S.Int }),
    })
  )
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => S.Struct({}),
      name: "deleteStorageBatch",
      returns: () => S.Struct({ deleted: S.Int, done: S.Boolean }),
    })
  );
