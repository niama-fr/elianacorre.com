import type { QueryCtx } from "@ec/backend/server";
import { ConvexError } from "convex/values";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getActiveNewsletterLegalBundle = async (ctx: QueryCtx) =>
  await ctx.db
    .query("newsletterLegalBundles")
    .withIndex("by_published_at", (q) => q.gt("publishedAt", null))
    .order("desc")
    .first();

export const getNewsletterLegalBundleAt = async (ctx: QueryCtx, occurredAt: number) =>
  await ctx.db
    .query("newsletterLegalBundles")
    .withIndex("by_published_at", (q) => q.lte("publishedAt", occurredAt))
    .order("desc")
    .first();

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireActiveNewsletterLegalBundle = async (ctx: QueryCtx) => {
  const doc = await getActiveNewsletterLegalBundle(ctx);
  if (!doc) throw new ConvexError("NO_ACTIVE_NEWSLETTER_LEGAL_BUNDLE");
  return doc;
};

export const requireNewsletterLegalBundleAt = async (ctx: QueryCtx, occurredAt: number) => {
  const doc = await getNewsletterLegalBundleAt(ctx, occurredAt);
  if (!doc) throw new ConvexError("NO_APPLICABLE_NEWSLETTER_LEGAL_BUNDLE");
  return doc;
};
