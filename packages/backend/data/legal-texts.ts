import type { QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { ConvexError } from "convex/values";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getPrivacyNotice = async (ctx: QueryCtx, id: Id<"legalTexts">) => {
  const doc = await ctx.db.get("legalTexts", id);
  return doc?.kind === "privacyNotice" ? doc : null;
};

export const getActivePrivacyNotice = async (ctx: QueryCtx) =>
  await ctx.db
    .query("legalTexts")
    .withIndex("by_kind_and_published_at", (q) => q.eq("kind", "privacyNotice").gt("publishedAt", null))
    .order("desc")
    .first();

export const getPrivacyNoticeAt = async (ctx: QueryCtx, occurredAt: number) =>
  await ctx.db
    .query("legalTexts")
    .withIndex("by_kind_and_published_at", (q) => q.eq("kind", "privacyNotice").lte("publishedAt", occurredAt))
    .order("desc")
    .first();

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireActivePrivacyNotice = async (ctx: QueryCtx) => {
  const doc = await getActivePrivacyNotice(ctx);
  if (!doc) throw new ConvexError("NO_ACTIVE_PRIVACY_NOTICE");
  return doc;
};

export const requireLegalText = async (ctx: QueryCtx, id: Id<"legalTexts">) => {
  const doc = await ctx.db.get("legalTexts", id);
  if (!doc) throw new ConvexError("UNKNOWN_LEGAL_TEXT");
  return doc;
};

export const requirePrivacyNoticeAt = async (ctx: QueryCtx, occurredAt: number) => {
  const doc = await getPrivacyNoticeAt(ctx, occurredAt);
  if (!doc) throw new ConvexError("NO_APPLICABLE_PRIVACY_NOTICE");
  return doc;
};

export const requirePublishedPrivacyNotice = async (ctx: QueryCtx, { id, requestedAt }: { id: Id<"legalTexts">; requestedAt: number }) => {
  const doc = await getPrivacyNotice(ctx, id);
  if (!doc || doc.publishedAt === null || doc.publishedAt > requestedAt) throw new ConvexError("INVALID_PRIVACY_NOTICE");
  return doc;
};
