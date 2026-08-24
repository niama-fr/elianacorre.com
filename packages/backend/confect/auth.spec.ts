import { FunctionSpec, GroupSpec } from "@confect/core";

import type { getAuthUser, onCreate, onDelete, onUpdate } from "../infra/better-auth";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(FunctionSpec.convexPublicQuery<typeof getAuthUser>()("getAuthUser"))
  // INTERNAL MUTATIONS --------------------------------------------------------------------------------------------------------------------
  .addFunction(FunctionSpec.convexInternalMutation<typeof onCreate>()("onCreate"))
  .addFunction(FunctionSpec.convexInternalMutation<typeof onUpdate>()("onUpdate"))
  .addFunction(FunctionSpec.convexInternalMutation<typeof onDelete>()("onDelete"));
