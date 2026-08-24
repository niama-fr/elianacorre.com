import type { Id } from "@ec/backend/types";
import type { Profiles } from "@ec/domain/schemas/profiles";
import type { PaginationOptions } from "convex/server";
import { Effect as E, Option as O } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnPatchError, dieOnDecodeError, dieOnEncodeError, optionById, optionByIndex } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getProfile = E.fn(function* (id: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("profiles").get(id).pipe(optionById);
});

export const getProfileByEmail = E.fn(function* (email: string) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("profiles").get("by_email", email).pipe(optionByIndex);
});

export const getProfileIdByEmail = E.fn(function* (email: string) {
  return yield* getProfileByEmail(email).pipe(E.map(O.map(({ _id }) => _id)));
});

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireProfile = E.fn(function* (id: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("profiles").get(id).pipe(dieOnDecodeError);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateProfiles = E.fn(function* (pagination: PaginationOptions) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("profiles").index("by_creation_time").paginate(pagination).pipe(dieOnDecodeError);
});

export const takeProfiles = E.fn(function* (limit: number) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("profiles").index("by_creation_time").take(limit).pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createAdminProfile = E.fn(function* (email: string) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("profiles").insert({ email, role: "admin" }).pipe(dieOnEncodeError);
});

export const createContactProfile = E.fn(function* (create: Profiles["Create"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer
    .table("profiles")
    .insert({ ...create, role: "contact" })
    .pipe(dieOnEncodeError);
});

export const createMemberProfile = E.fn(function* () {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("profiles").insert({ role: "member" }).pipe(dieOnEncodeError);
});

// ENSURE ----------------------------------------------------------------------------------------------------------------------------------
export const ensureAdminProfileId = E.fn(function* (email: string) {
  const profile = yield* getProfileByEmail(email);
  return O.isSome(profile) ? profile.value._id : yield* createAdminProfile(email);
});

export const ensureContactProfileId = E.fn(function* (create: Profiles["Create"]) {
  const profile = yield* getProfileByEmail(create.email);
  return O.isSome(profile) ? profile.value._id : yield* createContactProfile(create);
});

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchProfile = E.fn(function* (id: Id<"profiles">, patch: Profiles["Patch"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("profiles").patch(id, patch).pipe(dieOnPatchError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
const ERASURE_BATCH_SIZE = 50;

export const eraseProfileRelationsBatch = E.fn(function* ({ email, phase, profileId }: EraseProfileRelationsBatchOpts) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;

  if (phase === "ebookIssuances") {
    const issuance = yield* reader
      .table("ebookIssuances")
      .index("by_profile_id", (q) => q.eq("profileId", profileId))
      .first()
      .pipe(dieOnDecodeError);
    if (O.isNone(issuance)) return { done: true };
    const downloads = yield* reader
      .table("ebookDownloads")
      .index("by_ebook_issuance_id", (q) => q.eq("ebookIssuanceId", issuance.value._id))
      .take(ERASURE_BATCH_SIZE)
      .pipe(dieOnDecodeError);
    for (const download of downloads) yield* writer.table("ebookDownloads").delete(download._id);
    if (downloads.length === 0) yield* writer.table("ebookIssuances").delete(issuance.value._id);
    return { done: false };
  }

  if (phase === "newsSubscriptions") {
    const subscription = yield* reader
      .table("newsSubscriptions")
      .index("by_profile_id_and_unsubscribed_at", (q) => q.eq("profileId", profileId))
      .first()
      .pipe(dieOnDecodeError);
    if (O.isNone(subscription)) return { done: true };
    const confirmations = yield* reader
      .table("newsConfirmations")
      .index("by_subscription_id", (q) => q.eq("subscriptionId", subscription.value._id))
      .take(ERASURE_BATCH_SIZE)
      .pipe(dieOnDecodeError);
    for (const confirmation of confirmations) yield* writer.table("newsConfirmations").delete(confirmation._id);
    if (confirmations.length === 0) yield* writer.table("newsSubscriptions").delete(subscription.value._id);
    return { done: false };
  }

  if (phase === "contactRequests") {
    const docs = yield* reader
      .table("contactRequests")
      .index("by_profile_id", (q) => q.eq("profileId", profileId))
      .take(ERASURE_BATCH_SIZE)
      .pipe(dieOnDecodeError);
    for (const doc of docs) yield* writer.table("contactRequests").delete(doc._id);
    return { done: docs.length === 0 };
  }
  if (phase === "identities") {
    const docs = yield* reader
      .table("identities")
      .index("by_profile_id_and_adapter", (q) => q.eq("profileId", profileId))
      .take(ERASURE_BATCH_SIZE)
      .pipe(dieOnDecodeError);
    for (const doc of docs) yield* writer.table("identities").delete(doc._id);
    return { done: docs.length === 0 };
  }
  if (phase === "loopsTasks") {
    const docs = yield* reader
      .table("loopsTasks")
      .index("by_profile_id", (q) => q.eq("profileId", profileId))
      .take(ERASURE_BATCH_SIZE)
      .pipe(dieOnDecodeError);
    for (const doc of docs) yield* writer.table("loopsTasks").delete(doc._id);
    return { done: docs.length === 0 };
  }
  if (phase === "loopsWebhooks") {
    const docs = yield* reader
      .table("loopsWebhooks")
      .index("by_email", (q) => q.eq("email", email))
      .take(ERASURE_BATCH_SIZE)
      .pipe(dieOnDecodeError);
    for (const doc of docs) yield* writer.table("loopsWebhooks").delete(doc._id);
    return { done: docs.length === 0 };
  }
  const docs = yield* reader
    .table("newsRestrictions")
    .index("by_profile_id_and_resolved_at", (q) => q.eq("profileId", profileId))
    .take(ERASURE_BATCH_SIZE)
    .pipe(dieOnDecodeError);
  for (const doc of docs) yield* writer.table("newsRestrictions").delete(doc._id);
  return { done: docs.length === 0 };
});

export const hasProfileRelations = E.fn(function* ({ email, profileId }: { email: string; profileId: Id<"profiles"> }) {
  const reader = yield* DatabaseReader;
  const [contactRequest, ebookIssuance, identity, loopsTask, loopsWebhook, newsRestriction, newsSubscription] = yield* E.all([
    reader
      .table("contactRequests")
      .index("by_profile_id", (q) => q.eq("profileId", profileId))
      .first()
      .pipe(dieOnDecodeError),
    reader
      .table("ebookIssuances")
      .index("by_profile_id", (q) => q.eq("profileId", profileId))
      .first()
      .pipe(dieOnDecodeError),
    reader
      .table("identities")
      .index("by_profile_id_and_adapter", (q) => q.eq("profileId", profileId))
      .first()
      .pipe(dieOnDecodeError),
    reader
      .table("loopsTasks")
      .index("by_profile_id", (q) => q.eq("profileId", profileId))
      .first()
      .pipe(dieOnDecodeError),
    reader
      .table("loopsWebhooks")
      .index("by_email", (q) => q.eq("email", email))
      .first()
      .pipe(dieOnDecodeError),
    reader
      .table("newsRestrictions")
      .index("by_profile_id_and_resolved_at", (q) => q.eq("profileId", profileId))
      .first()
      .pipe(dieOnDecodeError),
    reader
      .table("newsSubscriptions")
      .index("by_profile_id_and_unsubscribed_at", (q) => q.eq("profileId", profileId))
      .first()
      .pipe(dieOnDecodeError),
  ]);
  return (
    O.isSome(contactRequest) ||
    O.isSome(ebookIssuance) ||
    O.isSome(identity) ||
    O.isSome(loopsTask) ||
    O.isSome(loopsWebhook) ||
    O.isSome(newsRestriction) ||
    O.isSome(newsSubscription)
  );
});

export type ProfileErasurePhase =
  | "contactRequests"
  | "ebookIssuances"
  | "identities"
  | "loopsTasks"
  | "loopsWebhooks"
  | "newsRestrictions"
  | "newsSubscriptions";
type EraseProfileRelationsBatchOpts = { email: string; phase: ProfileErasurePhase; profileId: Id<"profiles"> };
