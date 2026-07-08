import type { NewsletterBlocks } from "@ec/domain/schemas/newsletter-blocks";

import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsletterBlockByEmail = async (ctx: QueryCtx, email: NewsletterBlocks["Fields"]["email"]) =>
  await ctx.db
    .query("newsletterBlocks")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

export const recordProviderNewsletterBlock = async (
  ctx: MutationCtx,
  { email, now, reason }: { email: string; now: number; reason: Extract<NewsletterBlocks["Reason"], "bounced" | "complained"> }
) => {
  const current = await getNewsletterBlockByEmail(ctx, email);
  if (current?.reason === "complained" && reason !== "complained") return;
  if (current !== null && current.updatedAt > now && reason !== "complained") return;
  if (current === null) {
    await ctx.db.insert("newsletterBlocks", { createdAt: now, email, reason, source: "provider-webhook", updatedAt: now });
    return;
  }
  await ctx.db.patch(current._id, { reason, source: "provider-webhook", updatedAt: now });
};

export const clearConfirmableNewsletterBlock = async (ctx: MutationCtx, email: string, requestedAt: number) => {
  const block = await getNewsletterBlockByEmail(ctx, email);
  if (block !== null && block.reason !== "suppressed" && block.updatedAt <= requestedAt) await ctx.db.delete(block._id);
};

export const getValidConfirmableNewsletterBlock = async (
  ctx: QueryCtx,
  { confirmTokenHash, now }: { confirmTokenHash: string; now: number }
) => {
  const block = await ctx.db
    .query("newsletterBlocks")
    .withIndex("by_confirm_token_hash", (query) => query.eq("confirmTokenHash", confirmTokenHash))
    .unique();
  if (block === null || block.reason === "suppressed" || block.confirmRequestedAt === undefined) return null;
  return now < block.confirmRequestedAt + 24 * 60 * 60 * 1000 ? block : null;
};
