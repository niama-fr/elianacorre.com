import type { NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getCurrentNewsSubscription = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsSubscriptions")
    .withIndex("by_profile_id_and_unsubscribed_at", (query) => query.eq("profileId", profileId).eq("unsubscribedAt", null))
    .unique();

export const getActiveNewsSubscription = async (ctx: QueryCtx, profileId: Id<"profiles">) => {
  const subscription = await getCurrentNewsSubscription(ctx, profileId);
  return subscription?.confirmedAt === null ? null : subscription;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createNewsSubscription = async (ctx: MutationCtx, create: NewsSubscriptions["Create"]) =>
  await ctx.db.insert("newsSubscriptions", { ...create, confirmedAt: null, unsubscribedAt: null });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchNewsSubscription = async (ctx: MutationCtx, id: Id<"newsSubscriptions">, patch: Partial<NewsSubscriptions["Fields"]>) => {
  await ctx.db.patch("newsSubscriptions", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markNewsSubscriptionConfirmed = async (ctx: MutationCtx, id: Id<"newsSubscriptions">, now: number) => {
  await patchNewsSubscription(ctx, id, { confirmedAt: now });
};
