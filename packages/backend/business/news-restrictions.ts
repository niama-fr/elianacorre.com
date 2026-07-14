import type { MutationCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { NewsRestrictions } from "@ec/domain/schemas/news-restrictions";
import type { WithNow } from "@ec/domain/schemas/utils";

import {
  createProviderNewsRestriction,
  getActiveNewsRestriction,
  getLatestNewsRestriction,
  getNewsRestriction,
  patchNewsRestriction,
} from "../data/news-restrictions";

// APPLY PROVIDER RESTRICTION --------------------------------------------------------------------------------------------------------------
export async function applyProviderNewsRestriction(ctx: MutationCtx, { occurredAt, profileId, reason }: ApplyProviderRestrictionOpts) {
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
}
type ApplyProviderRestrictionOpts = { occurredAt: number; profileId: Id<"profiles">; reason: NewsRestrictions["Reason"] };

// RESOLVE BY CONFIRMATION -----------------------------------------------------------------------------------------------------------------
export async function resolveNewsRestrictionByConfirmation(ctx: MutationCtx, opts: ResolveByConfirmationOpts) {
  const { now, restrictionId, restrictionVersion } = opts;
  const restriction = await getNewsRestriction(ctx, restrictionId);
  if (!restriction || restriction.resolvedAt !== null) return false;
  if (restrictionVersion !== undefined && restriction.version !== restrictionVersion) return false;

  await patchNewsRestriction(ctx, restrictionId, { resolvedAt: now, resolvedBy: "confirmation" });
  return true;
}
type ResolveByConfirmationOpts = WithNow<{ restrictionVersion?: number; restrictionId: Id<"newsRestrictions"> }>;
