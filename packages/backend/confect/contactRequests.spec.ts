import { FunctionSpec, GroupSpec } from "@confect/core";
import { sCanonicalEmail, sTrimRequired } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const sCreateArgs = S.Struct({
  email: sCanonicalEmail,
  firstName: sTrimRequired,
  message: sTrimRequired,
  website: S.Trim,
});

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // MUTATIONS -----------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sCreateArgs,
      name: "create",
      returns: () => S.Null,
    })
  );
