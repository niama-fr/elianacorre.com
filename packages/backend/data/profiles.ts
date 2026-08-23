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
export const patchProfile = E.fn(function* (id: Id<"profiles">, patch: Partial<Profiles["Fields"]>) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("profiles").patch(id, patch).pipe(dieOnPatchError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteProfileWithRelations = E.fn(function* (id: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  const writer = yield* DatabaseWriter;

  const { _id: profileId, email } = yield* requireProfile(id).pipe(E.orDie);

  const contactRequests = yield* reader
    .table("contactRequests")
    .index("by_profile_id", (q) => q.eq("profileId", profileId))
    .collect()
    .pipe(dieOnDecodeError);

  const ebookIssuances = yield* reader
    .table("ebookIssuances")
    .index("by_profile_id", (q) => q.eq("profileId", profileId))
    .collect()
    .pipe(dieOnDecodeError);

  const identities = yield* reader
    .table("identities")
    .index("by_profile_id_and_adapter", (q) => q.eq("profileId", profileId))
    .collect()
    .pipe(dieOnDecodeError);

  const loopsTasks = yield* reader
    .table("loopsTasks")
    .index("by_profile_id", (q) => q.eq("profileId", profileId))
    .collect()
    .pipe(dieOnDecodeError);

  const loopsWebhooks = email
    ? yield* reader
        .table("loopsWebhooks")
        .index("by_email", (q) => q.eq("email", email))
        .collect()
        .pipe(dieOnDecodeError)
    : [];

  const restrictions = yield* reader
    .table("newsRestrictions")
    .index("by_profile_id_and_resolved_at", (q) => q.eq("profileId", profileId))
    .collect()
    .pipe(dieOnDecodeError);

  const subscriptions = yield* reader
    .table("newsSubscriptions")
    .index("by_profile_id_and_unsubscribed_at", (q) => q.eq("profileId", profileId))
    .collect()
    .pipe(dieOnDecodeError);

  for (const issuance of ebookIssuances) {
    const downloads = yield* reader
      .table("ebookDownloads")
      .index("by_ebook_issuance_id", (q) => q.eq("ebookIssuanceId", issuance._id))
      .collect()
      .pipe(dieOnDecodeError);

    for (const download of downloads) yield* writer.table("ebookDownloads").delete(download._id);

    yield* writer.table("ebookIssuances").delete(issuance._id);
  }

  for (const subscription of subscriptions) {
    const confirmations = yield* reader
      .table("newsConfirmations")
      .index("by_subscription_id", (q) => q.eq("subscriptionId", subscription._id))
      .collect()
      .pipe(dieOnDecodeError);

    for (const confirmation of confirmations) yield* writer.table("newsConfirmations").delete(confirmation._id);

    yield* writer.table("newsSubscriptions").delete(subscription._id);
  }

  for (const contactRequest of contactRequests) yield* writer.table("contactRequests").delete(contactRequest._id);
  for (const identity of identities) yield* writer.table("identities").delete(identity._id);
  for (const task of loopsTasks) yield* writer.table("loopsTasks").delete(task._id);
  for (const webhook of loopsWebhooks) yield* writer.table("loopsWebhooks").delete(webhook._id);
  for (const restriction of restrictions) yield* writer.table("newsRestrictions").delete(restriction._id);

  yield* writer.table("profiles").delete(profileId);
});
