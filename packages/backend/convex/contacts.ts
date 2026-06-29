import { zContactCreate } from "@ec/domain/schemas/contacts";

import { zMutation } from "./zod";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const create = zMutation({
  args: zContactCreate,
  handler: async (ctx, args) => await ctx.db.insert("contacts", args),
});
