import { FunctionSpec, GroupSpec } from "@confect/core";
import { sAuthError } from "@ec/domain/schemas/auth";
import { Schema as S } from "effect";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // MUTATIONS -----------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => S.Struct({}),
      error: () => sAuthError,
      name: "generateUploadUrl",
      returns: () => S.String,
    })
  )
  // INTERNAL MUTATIONS --------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.internalMutation({
      args: () => S.Struct({ before: S.NullOr(S.Int), cursor: S.NullOr(S.String) }),
      name: "purgeOrphans",
      returns: () => S.Struct({ cursor: S.NullOr(S.String), deleted: S.Int, done: S.Boolean }),
    })
  );
