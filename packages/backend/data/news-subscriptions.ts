import type { Id } from "@ec/backend/types";
import type { NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import type { WithNow } from "@ec/domain/schemas/utils";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnPatchError, dieOnDecodeError, dieOnEncodeError, optionById, optionByIndex } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsSubscription = E.fn(function* (id: Id<"newsSubscriptions">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("newsSubscriptions").get(id).pipe(optionById);
});

export const getCurrentNewsSubscription = E.fn(function* (profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("newsSubscriptions").get("by_profile_id_and_unsubscribed_at", profileId, null).pipe(optionByIndex);
});

export const getLatestConfirmedNewsSubscription = E.fn(function* (profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("newsSubscriptions")
    .index("by_profile_id_and_confirmed_at", (q) => q.eq("profileId", profileId).gt("confirmedAt", null), "desc")
    .first()
    .pipe(dieOnDecodeError);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listNewsSubscriptionsNewestFirst = E.fn(function* (profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("newsSubscriptions")
    .index("by_profile_id_and_confirmed_at", (q) => q.eq("profileId", profileId), "desc")
    .collect()
    .pipe(dieOnDecodeError);
});

export const takeNewsSubscriptions = E.fn("takeNewsSubscriptions")(function* (limit: number, profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("newsSubscriptions")
    .index("by_profile_id_and_confirmed_at", (q) => q.eq("profileId", profileId))
    .take(limit)
    .pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createNewsSubscription = E.fn(function* (payload: NewsSubscriptions["Create"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer
    .table("newsSubscriptions")
    .insert({ ...payload, confirmedAt: null, confirmedFrom: null, unsubscribedAt: null })
    .pipe(dieOnEncodeError);
});

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchNewsSubscription = E.fn(function* (id: Id<"newsSubscriptions">, patch: Partial<NewsSubscriptions["Fields"]>) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("newsSubscriptions").patch(id, patch).pipe(dieOnPatchError);
});

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markNewsSubscriptionConfirmed = E.fn(function* (id: Id<"newsSubscriptions">, { confirmedFrom, now }: Opts) {
  yield* patchNewsSubscription(id, { confirmedAt: now, confirmedFrom });
});
type Opts = WithNow<{ confirmedFrom: NewsSubscriptions["ConfirmedFrom"] }>;

export const markNewsSubscriptionUnsubscribed = E.fn(function* (id: Id<"newsSubscriptions">, now: number) {
  yield* patchNewsSubscription(id, { unsubscribedAt: now });
});
