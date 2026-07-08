import z from "zod";

import { zCanonicalEmail, zDocCommon } from "./utils";

export const zLoopsWebhookEventName = z.literal(["email.delivered", "email.hardBounced", "email.spamReported", "email.unsubscribed"]);

export const zLoopsWebhookEventFields = z.object({
  email: zCanonicalEmail,
  eventName: zLoopsWebhookEventName,
  eventTime: z.number(),
  messageId: z.string(),
  receivedAt: z.number(),
  webhookId: z.string(),
});

export const zLoopsWebhookEventDoc = z.object({ ...zDocCommon("loopsWebhookEvents").shape, ...zLoopsWebhookEventFields.shape });

export type LoopsWebhookEvents = {
  Fields: z.infer<typeof zLoopsWebhookEventFields>;
  EventName: z.infer<typeof zLoopsWebhookEventName>;
};
