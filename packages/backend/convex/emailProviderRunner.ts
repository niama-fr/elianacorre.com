import { zid } from "convex-helpers/server/zod4";

import { emailAdapter } from "../email-adapter.loops";
import { internal } from "./_generated/api";
import { zInternalAction } from "./zod";

// INTERNAL ACTIONS ------------------------------------------------------------------------------------------------------------------------
export const run = zInternalAction({
  args: { emailProviderJobId: zid("emailProviderJobs") },
  handler: async (ctx, { emailProviderJobId }) => {
    const claim = await ctx.runMutation(internal.emailProviderJobs.claim, { emailProviderJobId });
    if (!claim) return;

    try {
      await (claim.job.kind === "newsletter-contact-sync"
        ? emailAdapter.syncNewsletterContact(ctx, { ...claim.profile, profileId: claim.profile._id })
        : emailAdapter.sendTransactional(ctx, claim.job, claim.profile));
    } catch (unknownError) {
      const error = unknownError instanceof Error ? unknownError.message : "Unknown delivery error";
      await ctx.runMutation(internal.emailProviderJobs.recordSendFailure, {
        attempt: claim.job.attempts,
        emailProviderJobId,
        error,
      });
      return;
    }
    await ctx.runMutation(internal.emailProviderJobs.recordSendSuccess, { attempt: claim.job.attempts, emailProviderJobId });
  },
});
