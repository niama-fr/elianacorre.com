import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema as S } from "effect";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // INTERNAL ACTIONS -----------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.internalAction({
      args: () => S.Struct({}),
      name: "revalidatePrivacyNotice",
      returns: () => S.NullOr(S.Struct({ status: S.Literals(["revalidated"]) })),
    })
  );
