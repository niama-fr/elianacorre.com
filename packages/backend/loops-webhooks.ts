import type { LoopsWebhookEvents } from "@ec/domain/schemas/loops-webhook-events";
import { zLoopsWebhookEventName } from "@ec/domain/schemas/loops-webhook-events";
import z from "zod";

import type { MutationCtx } from "./convex/_generated/server";
import { enqueueSyncContact } from "./loops-tasks";
import { recordProviderNewsletterBlock } from "./newsletter-blocks";
import { getCurrentNewsletterSub, patchNewsletterSub } from "./newsletter-subs";
import { getProfileByEmail } from "./profiles";

const zLoopsWebhookPayload = z.object({
  contactIdentity: z.object({ email: z.email() }),
  email: z.object({ id: z.string() }),
  eventName: zLoopsWebhookEventName,
  eventTime: z.number(),
  webhookSchemaVersion: z.literal("1.0.0"),
});

export const parseLoopsWebhookPayload = (body: string, { receivedAt, webhookId }: { receivedAt: number; webhookId: string }) => {
  const payload = zLoopsWebhookPayload.parse(JSON.parse(body));
  return {
    email: payload.contactIdentity.email,
    eventName: payload.eventName,
    eventTime: payload.eventTime,
    messageId: payload.email.id,
    receivedAt,
    webhookId,
  } satisfies LoopsWebhookEvents["Fields"];
};

export const processLoopsWebhook = async (ctx: MutationCtx, event: LoopsWebhookEvents["Fields"]) => {
  const duplicate = await ctx.db
    .query("loopsWebhookEvents")
    .withIndex("by_webhook_id", (query) => query.eq("webhookId", event.webhookId))
    .unique();
  if (duplicate !== null) return { duplicate: true } as const;

  await ctx.db.insert("loopsWebhookEvents", event);
  const profile = await getProfileByEmail(ctx, event.email);
  if (profile === null) return { duplicate: false } as const;

  if (event.eventName === "email.unsubscribed") {
    const subscription = await getCurrentNewsletterSub(ctx, profile._id);
    const eventTime = event.eventTime * 1000;
    if (subscription !== null && eventTime >= subscription.requestedAt)
      await patchNewsletterSub(ctx, subscription._id, { unsubscribedAt: eventTime });
  }

  if (event.eventName === "email.hardBounced" || event.eventName === "email.spamReported")
    await recordProviderNewsletterBlock(ctx, {
      email: event.email,
      now: event.eventTime * 1000,
      reason: event.eventName === "email.hardBounced" ? "bounced" : "complained",
    });

  if (event.eventName !== "email.delivered")
    await enqueueSyncContact(ctx, {
      idempotencyKey: `loops-webhook-contact-sync:${event.webhookId}`,
      profileId: profile._id,
      subscribed: false,
    });

  return { duplicate: false } as const;
};
