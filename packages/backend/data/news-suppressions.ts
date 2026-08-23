import { env } from "@ec/backend/server";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import { Effect as E, Option as O } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError, optionByIndex } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getNewsSuppressionByEmail = E.fn(function* (email: string) {
  const reader = yield* DatabaseReader;
  const canonicalEmailHash = yield* hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return yield* reader.table("newsSuppressions").get("by_canonical_email_hash", canonicalEmailHash).pipe(optionByIndex);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const takeNewsSuppressions = E.fn(function* (limit: number) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("newsSuppressions").index("by_creation_time").take(limit).pipe(dieOnDecodeError);
});

// ENSURE ----------------------------------------------------------------------------------------------------------------------------------
export const ensureNewsSuppression = E.fn(function* (email: string) {
  const writer = yield* DatabaseWriter;
  const existing = yield* getNewsSuppressionByEmail(email);
  if (O.isSome(existing)) return existing.value._id;
  const canonicalEmailHash = yield* hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return yield* writer.table("newsSuppressions").insert({ canonicalEmailHash }).pipe(dieOnEncodeError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteNewsSuppressionByEmail = E.fn(function* (email: string) {
  const writer = yield* DatabaseWriter;
  const existing = yield* getNewsSuppressionByEmail(email);
  if (O.isNone(existing)) return false;
  yield* writer.table("newsSuppressions").delete(existing.value._id);
  return true;
});
