import { zCanonicalEmail, zDocCommon } from "@ec/domain/schemas/utils";
import z from "zod";

// NAME ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["email.hardBounced", "email.spamReported", "email.unsubscribed"] as const;
export const zLoopsWebhookKind = z.literal(kinds);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zLoopsWebhookFields = z.object({
  email: zCanonicalEmail,
  kind: zLoopsWebhookKind,
  messageId: z.string(),
  occurredAt: z.number(),
  webhookId: z.string(),
});
export const zLoopsWebhookDoc = z.object({ ...zDocCommon("loopsWebhooks").shape, ...zLoopsWebhookFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zLoopsWebhookValues = z
  .object({
    contactIdentity: z.object({ email: z.email() }),
    email: z.object({ id: z.string() }),
    eventName: zLoopsWebhookKind,
    eventTime: z.number(),
    webhookId: z.string(),
    webhookSchemaVersion: z.literal("1.0.0"),
  })
  .transform(({ contactIdentity: { email }, email: { id: messageId }, eventName: kind, eventTime, webhookId }) => ({
    email,
    kind,
    messageId,
    occurredAt: eventTime * 1000,
    webhookId,
  }));

export const zLoopsWebhookCreate = zLoopsWebhookFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type LoopsWebhooks = {
  Create: z.infer<typeof zLoopsWebhookCreate>;
  Doc: z.infer<typeof zLoopsWebhookDoc>;
  Fields: z.infer<typeof zLoopsWebhookFields>;
  Kind: z.infer<typeof zLoopsWebhookKind>;
  Values: z.infer<typeof zLoopsWebhookValues>;
};
