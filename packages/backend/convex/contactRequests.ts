import { zContactRequestCreateValues } from "@ec/domain/schemas/contact-requests";

import { ensureContactProfileId } from "../data/profiles";
import { zMutation } from "./zod";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const create = zMutation({
  args: zContactRequestCreateValues,
  handler: async (ctx, { email, firstName, lastName, message }) => {
    const profileId = await ensureContactProfileId(ctx, { email, firstName, lastName });
    // Note: see if it is pertinent to update the profile
    // if (profile) await ctx.db.patch(profile._id, { firstName, lastName });
    return await ctx.db.insert("contactRequests", { message, profileId });
  },
});
