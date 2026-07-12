import { verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { NewsRestrictions } from "@ec/domain/schemas/news-restrictions";
import type { WithNow } from "@ec/domain/schemas/utils";

import type { Id } from "./convex/_generated/dataModel";
import { env, type MutationCtx, type QueryCtx } from "./convex/_generated/server";
import { enqueueSendConfirmationEmail } from "./loops-tasks";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const NEWS_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsConfirmation = async (ctx: QueryCtx, id: Id<"newsConfirmations">) => await ctx.db.get("newsConfirmations", id);

export const getValidNewsConfirmationByToken = async (ctx: QueryCtx, { now, token }: WithNow<{ token: string }>) => {
  const capabilityId = await verifyCapabilityToken({ secret: env.CAPABILITY_SIGNING_SECRET, token });
  const id = capabilityId ? ctx.db.normalizeId("newsConfirmations", capabilityId) : null;
  if (!id) return null;

  const confirmation = await getNewsConfirmation(ctx, id);
  return confirmation && confirmation._creationTime + NEWS_CONFIRMATION_TTL_MS > now ? confirmation : null;
};

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

// BUSINESS -------------------------------------------------------------------------------------------------------------------------------
const replaceForSubscription = async (ctx: MutationCtx, payload: NewsConfirmations["Create"]) => {
  const existingConfirmations = await listNewsConfirmationsBySubscriptionId(ctx, payload.subscriptionId);
  for (const { _id } of existingConfirmations) await deleteNewsConfirmation(ctx, _id);
  return await ctx.db.insert("newsConfirmations", payload);
};

export const requestNewsConfirmationSubscription = async (
  ctx: MutationCtx,
  { profileId, restriction, subscriptionId }: RequestSubscriptionOpts
) => {
  const id = await replaceForSubscription(ctx, {
    kind: "subscription",
    restrictionId: restriction?._id ?? null,
    restrictionVersion: restriction?.version ?? null,
    subscriptionId,
  });
  await enqueueSendConfirmationEmail(ctx, { newsConfirmationId: id, profileId });
};
type RequestSubscriptionOpts = {
  profileId: Id<"profiles">;
  restriction: NewsRestrictions["Doc"] | null;
  subscriptionId: Id<"newsSubscriptions">;
};

export const requestNewsConfirmationReactivation = async (ctx: MutationCtx, opts: RequestReactivationOpts) => {
  const { profileId, restriction, subscriptionId } = opts;
  const { _id: restrictionId, version: restrictionVersion } = restriction;
  const id = await replaceForSubscription(ctx, { kind: "reactivation", restrictionId, restrictionVersion, subscriptionId });
  await enqueueSendConfirmationEmail(ctx, { newsConfirmationId: id, profileId });
};
type RequestReactivationOpts = {
  profileId: Id<"profiles">;
  restriction: NewsRestrictions["Doc"];
  subscriptionId: Id<"newsSubscriptions">;
};
