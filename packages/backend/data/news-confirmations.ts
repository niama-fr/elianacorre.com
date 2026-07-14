import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsConfirmation = async (ctx: QueryCtx, id: Id<"newsConfirmations">) => await ctx.db.get("newsConfirmations", id);

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listNewsConfirmationsBySubscriptionId = async (ctx: QueryCtx, id: Id<"newsSubscriptions">) =>
  await ctx.db
    .query("newsConfirmations")
    .withIndex("by_subscription_id", (q) => q.eq("subscriptionId", id))
    .collect();

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteNewsConfirmation = async (ctx: MutationCtx, id: Id<"newsConfirmations">) => {
  await ctx.db.delete(id);
};

// REPLACE ---------------------------------------------------------------------------------------------------------------------------------
export const replaceNewsConfirmationForSubscription = async (ctx: MutationCtx, payload: NewsConfirmations["Create"]) => {
  const existingConfirmations = await listNewsConfirmationsBySubscriptionId(ctx, payload.subscriptionId);
  for (const { _id } of existingConfirmations) await deleteNewsConfirmation(ctx, _id);
  return await ctx.db.insert("newsConfirmations", payload);
};
