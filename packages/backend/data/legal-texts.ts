import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { LegalTexts } from "@ec/domain/schemas/legal-texts";
import { ConvexError } from "convex/values";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getPrivacyNotice = async (ctx: QueryCtx, id: Id<"legalTexts">) => {
  const doc = await ctx.db.get("legalTexts", id);
  return doc?.kind === "privacyNotice" ? doc : null;
};

export const getActivePrivacyNotice = async (ctx: QueryCtx) =>
  await ctx.db
    .query("legalTexts")
    .withIndex("by_kind_and_published_at", (q) => q.eq("kind", "privacyNotice"))
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

export const requirePrivacyNoticeAt = async (ctx: QueryCtx, occurredAt: number) => {
  const doc = await getPrivacyNoticeAt(ctx, occurredAt);
  if (!doc) throw new ConvexError("NO_APPLICABLE_PRIVACY_NOTICE");
  return doc;
};

export const requirePrivacyNotice = async (ctx: QueryCtx, id: Id<"legalTexts">) => {
  const doc = await getPrivacyNotice(ctx, id);
  if (!doc) throw new ConvexError("INVALID_PRIVACY_NOTICE");
  return doc;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createPrivacyNotice = async (ctx: MutationCtx, create: Omit<LegalTexts["Create"], "kind">) =>
  await ctx.db.insert("legalTexts", { ...create, kind: "privacyNotice" });
