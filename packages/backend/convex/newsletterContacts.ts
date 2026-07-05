import { zid } from "convex-helpers/server/zod4";

import { emailAdapter } from "../email-adapter.loops";
import { getActiveNewsletterSub } from "../newsletter-subs";
import { getProfile } from "../profiles";
import { internal } from "./_generated/api";
import { zInternalAction, zInternalQuery } from "./zod";

// INTERNAL QUERIES ------------------------------------------------------------------------------------------------------------------------
export const getProjection = zInternalQuery({
  args: { profileId: zid("profiles") },
  handler: async (ctx, { profileId }) => {
    const sub = await getActiveNewsletterSub(ctx, profileId);
    if (sub === null) return null;

    const profile = await getProfile(ctx, profileId);
    if (profile === null) return null;

    return {
      email: profile.email,
      ...(profile.firstName === undefined ? {} : { firstName: profile.firstName }),
      ...(profile.lastName === undefined ? {} : { lastName: profile.lastName }),
      profileId,
    };
  },
});

// INTERNAL ACTIONS ------------------------------------------------------------------------------------------------------------------------
export const sync = zInternalAction({
  args: { profileId: zid("profiles") },
  handler: async (ctx, { profileId }) => {
    const projection = await ctx.runQuery(internal.newsletterContacts.getProjection, { profileId });
    if (projection) await emailAdapter.syncNewsletterContact(ctx, projection);
  },
});
