import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";

import type { MutationCtx, QueryCtx } from "./convex/_generated/server";
import { enqueueSyncContact } from "./loops-tasks";
import { recordProviderNewsletterBlock } from "./newsletter-blocks";
import { getCurrentNewsletterSub, patchNewsletterSub } from "./newsletter-subs";
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
export const processLoopsWebhook = async (ctx: MutationCtx, { email, kind, messageId, sentAt, webhookId }: LoopsWebhooks["Create"]) => {
  const existing = await getLoopsWebhookById(ctx, webhookId);
  if (existing) return;

  await createLoopsWebhook(ctx, { email, kind, messageId, sentAt, webhookId });
  const profile = await getProfileByEmail(ctx, email);
  if (!profile) return;

  if (kind === "email.unsubscribed") {
    const sub = await getCurrentNewsletterSub(ctx, profile._id);
    if (sub && sentAt >= sub.requestedAt) await patchNewsletterSub(ctx, sub._id, { unsubscribedAt: sentAt });
  } else await recordProviderNewsletterBlock(ctx, { email, now: sentAt, reason: kind === "email.hardBounced" ? "bounced" : "complained" });

  await enqueueSyncContact(ctx, { idempotencyKey: `loops-webhook-contact-sync:${webhookId}`, profileId: profile._id, subscribed: false });
};
