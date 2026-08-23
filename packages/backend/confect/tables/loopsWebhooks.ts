import { Table } from "@confect/server";
import { sLoopsWebhookFields } from "@ec/domain/schemas/loops-webhooks";

export default Table.make(() => sLoopsWebhookFields)
  .index("by_email", ["email"])
  .index("by_occurred_at", ["occurredAt"])
  .index("by_webhook_id", ["webhookId"]);
