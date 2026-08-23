import type { Id } from "@ec/backend/types";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError, optionById } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsConfirmation = E.fn(function* (id: Id<"newsConfirmations">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("newsConfirmations").get(id).pipe(optionById);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listNewsConfirmationsBySubscriptionId = E.fn(function* (id: Id<"newsSubscriptions">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("newsConfirmations")
    .index("by_subscription_id", (q) => q.eq("subscriptionId", id))
    .collect()
    .pipe(dieOnDecodeError);
});

export const takeNewsConfirmationsBySubscriptionId = E.fn(function* (limit: number, subscriptionId: Id<"newsSubscriptions">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("newsConfirmations")
    .index("by_subscription_id", (q) => q.eq("subscriptionId", subscriptionId))
    .take(limit)
    .pipe(dieOnDecodeError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteNewsConfirmation = E.fn(function* (id: Id<"newsConfirmations">) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("newsConfirmations").delete(id);
});

// REPLACE ---------------------------------------------------------------------------------------------------------------------------------
export const replaceNewsConfirmationForSubscription = E.fn(function* (payload: NewsConfirmations["Create"]) {
  const writer = yield* DatabaseWriter;
  const existingConfirmations = yield* listNewsConfirmationsBySubscriptionId(payload.subscriptionId);
  for (const { _id } of existingConfirmations) yield* deleteNewsConfirmation(_id);
  return yield* writer.table("newsConfirmations").insert(payload).pipe(dieOnEncodeError);
});
