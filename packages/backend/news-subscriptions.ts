import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import type { WithNow } from "@ec/domain/schemas/utils";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";
import { issueInitialEbookDownload, issueReplacementEbookDownload } from "./ebook-issuances";
import { enqueueSyncContactForReactivation, enqueueSyncContactForSubscription } from "./loops-tasks";
import { deleteNewsConfirmation } from "./news-confirmations";
import { getActiveNewsRestriction, markNewsRestrictionResolvedByConfirmation } from "./news-restrictions";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsSubscription = async (ctx: QueryCtx, id: Id<"newsSubscriptions">) => await ctx.db.get("newsSubscriptions", id);

export const getCurrentNewsSubscription = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsSubscriptions")
    .withIndex("by_profile_id_and_unsubscribed_at", (q) => q.eq("profileId", profileId).eq("unsubscribedAt", null))
    .unique();

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createNewsSubscription = async (ctx: MutationCtx, payload: NewsSubscriptions["Create"]) =>
  await ctx.db.insert("newsSubscriptions", { ...payload, confirmedAt: null, unsubscribedAt: null });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchNewsSubscription = async (ctx: MutationCtx, id: Id<"newsSubscriptions">, patch: Partial<NewsSubscriptions["Fields"]>) => {
  await ctx.db.patch("newsSubscriptions", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markNewsSubscriptionConfirmed = async (ctx: MutationCtx, id: Id<"newsSubscriptions">, now: number) => {
  await patchNewsSubscription(ctx, id, { confirmedAt: now });
};

export const markNewsSubscriptionUnsubscribed = async (ctx: MutationCtx, id: Id<"newsSubscriptions">, now: number) => {
  await patchNewsSubscription(ctx, id, { unsubscribedAt: now });
};

// BUSINESS --------------------------------------------------------------------------------------------------------------------------------
export const confirmReactivation = async (ctx: MutationCtx, { confirmation, now, profileId, subscription }: ConfirmReactivationOpts) => {
  if (subscription.confirmedAt === null) return { confirmed: false, downloadToken: null };

  const { restrictionId, restrictionVersion } = confirmation;
  const restored = await markNewsRestrictionResolvedByConfirmation(ctx, { now, restrictionId, restrictionVersion });
  await deleteNewsConfirmation(ctx, confirmation._id);
  if (!restored) return { confirmed: false, downloadToken: null };

  await enqueueSyncContactForReactivation(ctx, { confirmation, profileId });
  return { confirmed: true, downloadToken: await issueReplacementEbookDownload(ctx, { profileId, sendEmail: true }) };
};
type ConfirmReactivationOpts = ConfirmOpts & { confirmation: NewsConfirmations["ReactivationDoc"] };

export const confirmSubscription = async (ctx: MutationCtx, { confirmation, now, profileId, subscription }: ConfirmSubscriptionOpts) => {
  if (subscription.confirmedAt !== null) return { confirmed: false, downloadToken: null };

  await markNewsSubscriptionConfirmed(ctx, subscription._id, now);
  const activeRestriction = await getActiveNewsRestriction(ctx, profileId);

  let isEmailDeliveryAllowed = activeRestriction === null;
  if (
    activeRestriction !== null &&
    activeRestriction._id === confirmation.restrictionId &&
    activeRestriction.version === confirmation.restrictionVersion
  )
    isEmailDeliveryAllowed = await markNewsRestrictionResolvedByConfirmation(ctx, {
      now,
      restrictionId: activeRestriction._id,
      restrictionVersion: activeRestriction.version,
    });

  await deleteNewsConfirmation(ctx, confirmation._id);

  if (isEmailDeliveryAllowed) await enqueueSyncContactForSubscription(ctx, { profileId, subscriptionId: subscription._id });
  return { confirmed: true, downloadToken: await issueInitialEbookDownload(ctx, { profileId, sendEmail: isEmailDeliveryAllowed }) };
};
type ConfirmSubscriptionOpts = ConfirmOpts & { confirmation: NewsConfirmations["SubscriptionDoc"] };

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ConfirmOpts = WithNow<{ profileId: Id<"profiles">; subscription: NewsSubscriptions["Doc"] }>;
