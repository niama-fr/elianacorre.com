import { FunctionSpec, GroupSpec } from "@confect/core";
import { sAuthError } from "@ec/domain/schemas/auth";
import { Schema as S } from "effect";

import profiles from "./_generated/tables/profiles";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({}),
      error: () => sAuthError,
      name: "current",
      returns: () => profiles.Doc,
    })
  );
