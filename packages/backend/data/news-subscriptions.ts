import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import type { WithNow } from "@ec/domain/schemas/utils";
import { ConvexError } from "convex/values";

import { requirePublishedPrivacyNotice } from "./legal-texts";
import { requirePublishedNewsletterLegalBundle } from "./newsletter-legal-bundles";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsSubscription = async (ctx: QueryCtx, id: Id<"newsSubscriptions">) => await ctx.db.get("newsSubscriptions", id);

export const getCurrentNewsSubscription = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsSubscriptions")
    .withIndex("by_profile_id_and_unsubscribed_at", (q) => q.eq("profileId", profileId).eq("unsubscribedAt", null))
    .unique();

export const getLatestConfirmedNewsSubscription = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsSubscriptions")
    .withIndex("by_profile_id_and_confirmed_at", (q) => q.eq("profileId", profileId).gt("confirmedAt", null))
    .order("desc")
    .first();

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listNewsSubscriptionsNewestFirst = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsSubscriptions")
    .withIndex("by_profile_id_and_confirmed_at", (q) => q.eq("profileId", profileId))
    .order("desc")
    .collect();

export const takeNewsSubscriptions = async (ctx: QueryCtx, limit: number, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsSubscriptions")
    .withIndex("by_profile_id_and_confirmed_at", (q) => q.eq("profileId", profileId))
    .take(limit);

export const resolveNewsSubscriptionPrivacyNoticeId = async (ctx: QueryCtx, subscription: NewsSubscriptions["Doc"]) => {
  if (subscription.privacyNoticeId !== undefined) {
    await requirePublishedPrivacyNotice(ctx, { id: subscription.privacyNoticeId, requestedAt: subscription.requestedAt });
    return subscription.privacyNoticeId;
  }
  if (subscription.legalBundleId === undefined) throw new ConvexError("MISSING_SUBSCRIPTION_PRIVACY_NOTICE");

  const bundle = await requirePublishedNewsletterLegalBundle(ctx, {
    id: subscription.legalBundleId,
    requestedAt: subscription.requestedAt,
  });
  await requirePublishedPrivacyNotice(ctx, { id: bundle.privacyNoticeId, requestedAt: subscription.requestedAt });
  return bundle.privacyNoticeId;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createNewsSubscription = async (ctx: MutationCtx, payload: NewsSubscriptions["Create"]) =>
  await ctx.db.insert("newsSubscriptions", { ...payload, confirmedAt: null, confirmedFrom: null, unsubscribedAt: null });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchNewsSubscription = async (ctx: MutationCtx, id: Id<"newsSubscriptions">, patch: Partial<NewsSubscriptions["Fields"]>) => {
  await ctx.db.patch("newsSubscriptions", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markNewsSubscriptionConfirmed = async (ctx: MutationCtx, id: Id<"newsSubscriptions">, { confirmedFrom, now }: Opts) => {
  await patchNewsSubscription(ctx, id, { confirmedAt: now, confirmedFrom });
};
type Opts = WithNow<{ confirmedFrom: NewsSubscriptions["ConfirmedFrom"] }>;

export const markNewsSubscriptionUnsubscribed = async (ctx: MutationCtx, id: Id<"newsSubscriptions">, now: number) => {
  await patchNewsSubscription(ctx, id, { unsubscribedAt: now });
};
