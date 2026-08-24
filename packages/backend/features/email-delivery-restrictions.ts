import type { Id } from "@ec/backend/types";
import type { NewsRestrictions } from "@ec/domain/schemas/news-restrictions";
import type { WithNow } from "@ec/domain/schemas/utils";
import { Effect as E, Option as O } from "effect";

import {
  createProviderNewsRestriction,
  getActiveNewsRestriction,
  getLatestNewsRestriction,
  getNewsRestriction,
  patchNewsRestriction,
} from "../data/news-restrictions";

// APPLY PROVIDER RESTRICTION --------------------------------------------------------------------------------------------------------------
export const applyEmailDeliveryRestriction = E.fn(function* ({ occurredAt, profileId, reason }: ApplyRestrictionOpts) {
  const current = yield* getActiveNewsRestriction(profileId);
  if (O.isNone(current)) {
    const latest = yield* getLatestNewsRestriction(profileId);
    if (O.isSome(latest) && latest.value.resolvedAt !== null && occurredAt <= latest.value.resolvedAt) return latest.value._id;
    return yield* createProviderNewsRestriction({ lastOccurredAt: occurredAt, profileId, reason });
  }
  const nextReason = reason === "spamComplaint" ? reason : current.value.reason;
  const isNewer = occurredAt > current.value.lastOccurredAt;
  const upgradesReason = nextReason !== current.value.reason;
  if (!isNewer && !upgradesReason) return current.value._id;
  yield* patchNewsRestriction(current.value._id, {
    lastOccurredAt: Math.max(current.value.lastOccurredAt, occurredAt),
    reason: nextReason,
    restrictedBy: "provider",
    version: current.value.version + 1,
  });

  return current.value._id;
});
type ApplyRestrictionOpts = { occurredAt: number; profileId: Id<"profiles">; reason: NewsRestrictions["Reason"] };

// RESOLVE BY CONFIRMATION -----------------------------------------------------------------------------------------------------------------
export const resolveEmailDeliveryRestrictionByConfirmation = E.fn(function* (opts: ResolveByConfirmationOpts) {
  const { now, restrictionId, restrictionVersion } = opts;
  const restriction = yield* getNewsRestriction(restrictionId);
  if (O.isNone(restriction) || restriction.value.resolvedAt !== null) return false;
  if (restrictionVersion !== undefined && restriction.value.version !== restrictionVersion) return false;
  yield* patchNewsRestriction(restrictionId, { resolvedAt: now, resolvedBy: "confirmation" });
  return true;
});
type ResolveByConfirmationOpts = WithNow<{ restrictionVersion?: number; restrictionId: Id<"newsRestrictions"> }>;
