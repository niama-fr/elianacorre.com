import { zid } from "convex-helpers/server/zod4";

import { emailAdapter } from "../email-adapter.loops";
import { internal } from "./_generated/api";
import { zInternalAction } from "./zod";

// INTERNAL ACTIONS ------------------------------------------------------------------------------------------------------------------------
export const send = zInternalAction({
  args: { emailJobId: zid("emailJobs") },
  handler: async (ctx, { emailJobId }) => {
    const claim = await ctx.runMutation(internal.emailJobs.claim, { emailJobId });
    if (!claim) return;

    try {
      await emailAdapter.sendTransactional(ctx, claim.job, claim.profile);
    } catch (unknownError) {
      const error = unknownError instanceof Error ? unknownError.message : "Unknown delivery error";
      await ctx.runMutation(internal.emailJobs.recordSendFailure, { attempt: claim.job.attempts, emailJobId, error });
      return;
    }
    await ctx.runMutation(internal.emailJobs.recordSendSuccess, { attempt: claim.job.attempts, emailJobId });
  },
});
