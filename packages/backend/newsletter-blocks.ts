import type { NewsletterBlocks } from "@ec/domain/schemas/newsletter-blocks";

import type { QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsletterBlockByEmail = async (ctx: QueryCtx, email: NewsletterBlocks["Fields"]["email"]) =>
  await ctx.db
    .query("newsletterBlocks")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
