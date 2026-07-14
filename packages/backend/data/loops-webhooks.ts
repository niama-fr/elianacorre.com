import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getLoopsWebhookById = async (ctx: QueryCtx, webhookId: string) =>
  await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
    .unique();

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createLoopsWebhook = async (ctx: MutationCtx, create: LoopsWebhooks["Create"]) => await ctx.db.insert("loopsWebhooks", create);
