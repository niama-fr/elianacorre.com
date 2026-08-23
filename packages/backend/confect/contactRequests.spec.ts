import { FunctionSpec, GroupSpec } from "@confect/core";
import { sContactRequestCreateValues } from "@ec/domain/schemas/contact-requests";

import { Id } from "./_generated/id";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // MUTATIONS -----------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sContactRequestCreateValues,
      name: "create",
      returns: () => Id("contactRequests"),
    })
  );
