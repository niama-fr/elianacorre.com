import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema as S } from "effect";

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // INTERNAL MUTATIONS --------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => S.Struct({}),
      name: "init",
      returns: () => S.Null,
    })
  );
