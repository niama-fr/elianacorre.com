import { zLoopsWebhookEventFields } from "@ec/domain/schemas/loops-webhook-events";

import { processLoopsWebhook } from "../loops-webhooks";
import { zInternalMutation } from "./zod";

export const process = zInternalMutation({
  args: zLoopsWebhookEventFields,
  handler: async (ctx, event) => await processLoopsWebhook(ctx, event),
});
