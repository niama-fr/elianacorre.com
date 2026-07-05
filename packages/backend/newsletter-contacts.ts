import { internal } from "./convex/_generated/api";
import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx } from "./convex/_generated/server";

// SCHEDULER -------------------------------------------------------------------------------------------------------------------------------
export const scheduleNewsletterContactSync = async (ctx: MutationCtx, profileId: Id<"profiles">, { delayMs = 0 }: Opts = {}) => {
  await ctx.scheduler.runAfter(Math.max(0, delayMs), internal.newsletterContacts.sync, { profileId });
};
type Opts = { delayMs?: number };
