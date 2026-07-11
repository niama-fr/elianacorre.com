import type { NewsRestrictions } from "@ec/domain/schemas/news-restrictions";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getActiveNewsRestriction = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsRestrictions")
    .withIndex("by_profile_id_and_resolved_at", (query) => query.eq("profileId", profileId).eq("resolvedAt", null))
    .unique();

export const getLatestNewsRestriction = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsRestrictions")
    .withIndex("by_profile_id_and_restricted_at", (query) => query.eq("profileId", profileId))
    .order("desc")
    .first();

// BUSINESS --------------------------------------------------------------------------------------------------------------------------------
export const recordProviderNewsRestriction = async (
  ctx: MutationCtx,
  { occurredAt, profileId, reason }: { occurredAt: number; profileId: Id<"profiles">; reason: NewsRestrictions["Reason"] }
) => {
  const current = await getActiveNewsRestriction(ctx, profileId);
  if (current === null) {
    const latest = await getLatestNewsRestriction(ctx, profileId);
    if (latest !== null && latest.resolvedAt !== null && occurredAt <= latest.resolvedAt) return latest._id;
    return await ctx.db.insert("newsRestrictions", {
      lastOccurredAt: occurredAt,
      profileId,
      reason,
      resolvedAt: null,
      resolvedBy: null,
      restrictedAt: occurredAt,
      source: "provider",
      version: 1,
    });
  }

  const nextReason = reason === "spamComplaint" ? reason : current.reason;
  const isNewer = occurredAt > current.lastOccurredAt;
  const upgradesReason = nextReason !== current.reason;
  if (!isNewer && !upgradesReason) return current._id;

  await ctx.db.patch("newsRestrictions", current._id, {
    lastOccurredAt: Math.max(current.lastOccurredAt, occurredAt),
    reason: nextReason,
    source: "provider",
    version: current.version + 1,
  });
  return current._id;
};

export const resolveNewsRestriction = async (
  ctx: MutationCtx,
  {
    expectedVersion,
    id,
    now,
    resolvedBy,
  }: { expectedVersion?: number; id: Id<"newsRestrictions">; now: number; resolvedBy: "admin" | "confirmation" }
) => {
  const restriction = await ctx.db.get("newsRestrictions", id);
  if (restriction === null || restriction.resolvedAt !== null) return false;
  if (expectedVersion !== undefined && restriction.version !== expectedVersion) return false;

  await ctx.db.patch("newsRestrictions", id, { resolvedAt: now, resolvedBy });
  return true;
};
