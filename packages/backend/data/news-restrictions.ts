import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { NewsRestrictions } from "@ec/domain/schemas/news-restrictions";
import type { WithNow } from "@ec/domain/schemas/utils";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsRestriction = async (ctx: QueryCtx, id: Id<"newsRestrictions">) => await ctx.db.get("newsRestrictions", id);

export const getActiveNewsRestriction = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsRestrictions")
    .withIndex("by_profile_id_and_resolved_at", (q) => q.eq("profileId", profileId).eq("resolvedAt", null))
    .unique();

export const getLatestNewsRestriction = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("newsRestrictions")
    .withIndex("by_profile_id_and_restricted_at", (q) => q.eq("profileId", profileId))
    .order("desc")
    .first();

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createProviderNewsRestriction = async (ctx: MutationCtx, payload: NewsRestrictions["Create"]) =>
  await ctx.db.insert("newsRestrictions", {
    ...payload,
    resolvedAt: null,
    resolvedBy: null,
    restrictedAt: payload.lastOccurredAt,
    restrictedBy: "provider",
    version: 1,
  });

// PATCH ----------------------------------------------------------------------------------------------------------------------------------
export const patchNewsRestriction = async (ctx: MutationCtx, id: Id<"newsRestrictions">, patch: Partial<NewsRestrictions["Fields"]>) => {
  await ctx.db.patch("newsRestrictions", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markNewsRestrictionByProvider = async (ctx: MutationCtx, { occurredAt, profileId, reason }: MarkByProviderOpts) => {
  const current = await getActiveNewsRestriction(ctx, profileId);
  if (current === null) {
    const latest = await getLatestNewsRestriction(ctx, profileId);
    if (latest !== null && latest.resolvedAt !== null && occurredAt <= latest.resolvedAt) return latest._id;
    return await createProviderNewsRestriction(ctx, { lastOccurredAt: occurredAt, profileId, reason });
  }

  const nextReason = reason === "spamComplaint" ? reason : current.reason;
  const isNewer = occurredAt > current.lastOccurredAt;
  const upgradesReason = nextReason !== current.reason;
  if (!isNewer && !upgradesReason) return current._id;

  await patchNewsRestriction(ctx, current._id, {
    lastOccurredAt: Math.max(current.lastOccurredAt, occurredAt),
    reason: nextReason,
    restrictedBy: "provider",
    version: current.version + 1,
  });
  return current._id;
};
type MarkByProviderOpts = { occurredAt: number; profileId: Id<"profiles">; reason: NewsRestrictions["Reason"] };

export const markNewsRestrictionResolvedByConfirmation = async (ctx: MutationCtx, opts: MarkResolvedOpts) => {
  const { now, restrictionId, restrictionVersion } = opts;
  const restriction = await getNewsRestriction(ctx, restrictionId);
  if (!restriction || restriction.resolvedAt !== null) return false;
  if (restrictionVersion !== undefined && restriction.version !== restrictionVersion) return false;

  await patchNewsRestriction(ctx, restrictionId, { resolvedAt: now, resolvedBy: "confirmation" });
  return true;
};
type MarkResolvedOpts = WithNow<{ restrictionVersion?: number; restrictionId: Id<"newsRestrictions"> }>;
