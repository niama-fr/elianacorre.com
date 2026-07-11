import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";

import type { MutationCtx, QueryCtx } from "./convex/_generated/server";
import { enqueueSyncContact } from "./loops-tasks";
import { recordProviderNewsRestriction } from "./news-restrictions";
import { getCurrentNewsSubscription, patchNewsSubscription } from "./news-subscriptions";
import { getProfileByEmail } from "./profiles";

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

  await createLoopsWebhook(ctx, { email, kind, messageId, occurredAt, webhookId });
  const profile = await getProfileByEmail(ctx, email);
  if (!profile) return;

  if (kind === "email.unsubscribed") {
    const subscription = await getCurrentNewsSubscription(ctx, profile._id);
    if (!subscription || occurredAt < subscription.requestedAt) return;
    await patchNewsSubscription(ctx, subscription._id, { unsubscribedAt: occurredAt });
  } else
    await recordProviderNewsRestriction(ctx, {
      occurredAt,
      profileId: profile._id,
      reason: kind === "email.hardBounced" ? "permanentBounce" : "spamComplaint",
    });

  await enqueueSyncContact(ctx, { idempotencyKey: `loops-webhook-contact-sync:${webhookId}`, profileId: profile._id, subscribed: false });
};
