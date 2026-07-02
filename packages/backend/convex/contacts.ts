import { zContactCreateValues } from "@ec/domain/schemas/contacts";
import { normalizeProfileEmail } from "@ec/domain/schemas/profiles";

import { zMutation } from "./zod";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const create = zMutation({
  args: zContactCreateValues,
  handler: async (ctx, { email: submittedEmail, forename, message, surname }) => {
    const email = normalizeProfileEmail(submittedEmail);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (query) => query.eq("email", email))
      .unique();
    const profileId =
      profile?._id ??
      (await ctx.db.insert("profiles", {
        email,
        firstName: forename,
        lastName: surname,
        role: "contact",
        userId: null,
      }));
    if (profile !== null) await ctx.db.patch(profile._id, { firstName: forename, lastName: surname });

    return await ctx.db.insert("contactRequests", { message, profileId });
  },
});
