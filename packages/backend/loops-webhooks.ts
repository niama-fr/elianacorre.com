import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";

import type { MutationCtx, QueryCtx } from "./convex/_generated/server";
import { enqueueSyncContactForUnsubscription } from "./loops-tasks";
import { markNewsRestrictionByProvider } from "./news-restrictions";
import { getCurrentNewsSubscription, markNewsSubscriptionUnsubscribed } from "./news-subscriptions";
import { getProfileIdByEmail } from "./profiles";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getLoopsWebhookById = async (ctx: QueryCtx, webhookId: string) =>
  await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
    .unique();

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createLoopsWebhook = async (ctx: MutationCtx, create: LoopsWebhooks["Create"]) => await ctx.db.insert("loopsWebhooks", create);

// BUSINESS --------------------------------------------------------------------------------------------------------------------------------
export const processLoopsWebhook = async (ctx: MutationCtx, { email, kind, messageId, occurredAt, webhookId }: LoopsWebhooks["Create"]) => {
  const existing = await getLoopsWebhookById(ctx, webhookId);
  if (existing) return;

  const id = await createLoopsWebhook(ctx, { email, kind, messageId, occurredAt, webhookId });
  const profileId = await getProfileIdByEmail(ctx, email);
  if (!profileId) return;

  if (kind === "email.unsubscribed") {
    const subscription = await getCurrentNewsSubscription(ctx, profileId);
    if (!subscription || occurredAt < subscription.requestedAt) return;
    await markNewsSubscriptionUnsubscribed(ctx, subscription._id, occurredAt);
  } else {
    const reason = kind === "email.hardBounced" ? "permanentBounce" : "spamComplaint";
    await markNewsRestrictionByProvider(ctx, { occurredAt, profileId, reason });
  }

  await enqueueSyncContactForUnsubscription(ctx, { profileId, webhookId: id });
};
