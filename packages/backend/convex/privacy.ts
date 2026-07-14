import { zCanonicalEmail } from "@ec/domain/schemas/utils";

import { inspectPerson as inspectPersonData } from "../business/privacy";
import { zAdminQuery } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const inspectPerson = zAdminQuery({
  args: { email: zCanonicalEmail },
  handler: async (ctx, { email }) => await inspectPersonData(ctx, email),
});
