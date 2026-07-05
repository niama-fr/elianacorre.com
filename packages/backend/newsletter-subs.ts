import type { NewsletterSubs } from "@ec/domain/schemas/newsletter-subs";
import type { WithNow } from "@ec/domain/schemas/utils";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";
import { scheduleNewsletterContactSync } from "./newsletter-contacts";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getCurrentNewsletterSub = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsletterSubs")
    .withIndex("by_profile_id_and_unsubscribed_at", (q) => q.eq("profileId", profileId).eq("unsubscribedAt", null))
    .unique();

export const getActiveNewsletterSub = async (ctx: QueryCtx, profileId: Id<"profiles">) => {
  const doc = await getCurrentNewsletterSub(ctx, profileId);
  return doc && doc.confirmedAt !== null ? doc : null;
};

export const getValidPendingNewsletterSub = async (ctx: QueryCtx, { confirmTokenHash, now }: WithNow<{ confirmTokenHash: string }>) => {
  const doc = await ctx.db
    .query("newsletterSubs")
    .withIndex("by_confirm_token_hash", (q) => q.eq("confirmTokenHash", confirmTokenHash))
    .unique();
  return doc && doc.confirmedAt === null && doc.unsubscribedAt === null && now < doc.requestedAt + CONFIRMATION_TTL_MS ? doc : null;
};

// HAS -------------------------------------------------------------------------------------------------------------------------------------
export const hasConfirmedNewsletterSub = async (ctx: QueryCtx, profileId: Id<"profiles">) => {
  const doc = await ctx.db
    .query("newsletterSubs")
    .withIndex("by_profile_id_and_confirmed_at", (q) => q.eq("profileId", profileId).gt("confirmedAt", null))
    .first();
  return !!doc;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createNewsletterSub = async (ctx: MutationCtx, payload: Omit<NewsletterSubs["Fields"], "confirmedAt" | "unsubscribedAt">) =>
  await ctx.db.insert("newsletterSubs", { ...payload, confirmedAt: null, unsubscribedAt: null });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchNewsletterSub = async (ctx: MutationCtx, id: Id<"newsletterSubs">, patch: Partial<NewsletterSubs["Fields"]>) => {
  await ctx.db.patch("newsletterSubs", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markNewsletterSubConfirmed = async (ctx: MutationCtx, id: Id<"newsletterSubs">, { now, profileId }: MarkConfirmedOpts) => {
  await patchNewsletterSub(ctx, id, { confirmTokenHash: null, confirmedAt: now });
  await scheduleNewsletterContactSync(ctx, profileId);
};
type MarkConfirmedOpts = WithNow<{ profileId: Id<"profiles"> }>;
