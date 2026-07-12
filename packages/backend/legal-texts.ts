import { ConvexError } from "convex/values";

import type { Id } from "./convex/_generated/dataModel";
import type { QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getActiveNewsletterConsent = async (ctx: QueryCtx) =>
  await ctx.db
    .query("legalTexts")
    .withIndex("by_kind_and_published_at", (q) => q.eq("kind", "newsletterConsent").gt("publishedAt", null))
    .order("desc")
    .first();

export const getActivePrivacyNotice = async (ctx: QueryCtx) =>
  await ctx.db
    .query("legalTexts")
    .withIndex("by_kind_and_published_at", (q) => q.eq("kind", "privacyNotice").gt("publishedAt", null))
    .order("desc")
    .first();

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireLegalText = async (ctx: QueryCtx, id: Id<"legalTexts">) => {
  const doc = await ctx.db.get("legalTexts", id);
  if (!doc) throw new ConvexError("UNKNOWN_LEGAL_TEXT");
  return doc;
};
