import type { Id } from "./convex/_generated/dataModel";
import type { QueryCtx } from "./convex/_generated/server";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const FORMER_NEWSLETTER_SUBSCRIBER_RETENTION_MS = 3 * 365 * 24 * 60 * 60 * 1000;

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const hasWelcomeEbookAccess = async (ctx: QueryCtx, { now, profileId }: HasWelcomeEbookAccessOpts) => {
  const [profile, subscriptions, latestIssuance] = await Promise.all([
    ctx.db.get(profileId),
    ctx.db
      .query("newsSubscriptions")
      .withIndex("by_profile_id_and_confirmed_at", (q) => q.eq("profileId", profileId))
      .order("desc")
      .collect(),
    ctx.db
      .query("ebookIssuances")
      .withIndex("by_profile_id", (q) => q.eq("profileId", profileId))
      .order("desc")
      .first(),
  ]);
  if (profile === null) return false;

  const latestConfirmedSubscription = subscriptions.find((subscription) => subscription.confirmedAt !== null);
  if (!latestConfirmedSubscription) return false;
  if (latestConfirmedSubscription.unsubscribedAt === null) return true;

  const lastRelevantContactAt = Math.max(latestConfirmedSubscription.unsubscribedAt, latestIssuance?._creationTime ?? 0);
  return lastRelevantContactAt + FORMER_NEWSLETTER_SUBSCRIBER_RETENTION_MS > now;
};
type HasWelcomeEbookAccessOpts = { now: number; profileId: Id<"profiles"> };
