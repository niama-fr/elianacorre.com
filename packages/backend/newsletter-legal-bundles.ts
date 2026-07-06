import { ConvexError } from "convex/values";

import type { QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getActiveNewsletterLegalBundle = async (ctx: QueryCtx) =>
  await ctx.db
    .query("newsletterLegalBundles")
    .withIndex("by_published_at", (q) => q.gt("publishedAt", null))
    .order("desc")
    .first();

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireActiveNewsletterLegalBundle = async (ctx: QueryCtx) => {
  const doc = await getActiveNewsletterLegalBundle(ctx);
  if (!doc) throw new ConvexError("NO_ACTIVE_NEWLETTER_LEGAL_BUNDLE");
  return doc;
};
