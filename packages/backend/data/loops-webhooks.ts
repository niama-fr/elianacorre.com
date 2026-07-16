import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";
import type { PaginationOptions } from "convex/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getLoopsWebhookById = async (ctx: QueryCtx, webhookId: string) =>
  await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_webhook_id", (q) => q.eq("webhookId", webhookId))
    .unique();

// LIST -------------------------------------------------------------------------------------------------------------------------------------
export const paginateExpiredLoopsWebhooks = async (ctx: MutationCtx, pagination: PaginationOptions, before: number) =>
  await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_occurred_at", (q) => q.lte("occurredAt", before))
    .paginate(pagination);

export const takeLoopsWebhooksByEmail = async (ctx: QueryCtx, limit: number, email: string) =>
  await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_email", (q) => q.eq("email", email))
    .take(limit);

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createLoopsWebhook = async (ctx: MutationCtx, create: LoopsWebhooks["Create"]) => await ctx.db.insert("loopsWebhooks", create);

// PATCH ----------------------------------------------------------------------------------------------------------------------------------
export const patchLoopsWebhook = async (ctx: MutationCtx, id: Id<"loopsWebhooks">, patch: Partial<LoopsWebhooks["Fields"]>) => {
  await ctx.db.patch("loopsWebhooks", id, patch);
};

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteLoopsWebhook = async (ctx: MutationCtx, id: Id<"loopsWebhooks">) => {
  await ctx.db.delete("loopsWebhooks", id);
};
