import type { Id } from "@ec/backend/types";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";
import type { PrivacyGrants } from "@ec/domain/schemas/privacy-grants";
import type { WithNow } from "@ec/domain/schemas/utils";
import { ConvexError } from "convex/values";
import { Config, Effect as E, Option as O } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError, optionByIndex } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getPrivacyGrant = E.fn(function* ({ email, requestKind }: GrantRef) {
  const reader = yield* DatabaseReader;
  const secret = yield* Config.string("SUPPRESSION_HASH_SECRET").pipe(E.orDie);
  const subjectHash = yield* hashCanonicalEmail({ email, secret });
  return yield* reader.table("privacyGrants").get("by_subject_hash_and_request_kind", subjectHash, requestKind).pipe(optionByIndex);
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listPrivacyGrantsByEmail = E.fn(function* (email: string) {
  const reader = yield* DatabaseReader;
  const secret = yield* Config.string("SUPPRESSION_HASH_SECRET").pipe(E.orDie);
  const subjectHash = yield* hashCanonicalEmail({ email, secret });
  return yield* reader
    .table("privacyGrants")
    .index("by_subject_hash_and_request_kind", (q) => q.eq("subjectHash", subjectHash))
    .collect()
    .pipe(dieOnDecodeError);
});

export const listPrivacyGrantsByRequestKind = E.fn(function* ({ email, requestKind }: GrantRef) {
  const reader = yield* DatabaseReader;
  const secret = yield* Config.string("SUPPRESSION_HASH_SECRET").pipe(E.orDie);
  const subjectHash = yield* hashCanonicalEmail({ email, secret });
  return yield* reader
    .table("privacyGrants")
    .index("by_subject_hash_and_request_kind", (q) => q.eq("subjectHash", subjectHash).eq("requestKind", requestKind))
    .collect()
    .pipe(dieOnDecodeError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deletePrivacyGrant = E.fn(function* (id: Id<"privacyGrants">) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("privacyGrants").delete(id);
});

// REVOKE ----------------------------------------------------------------------------------------------------------------------------------
export const revokePrivacyGrant = E.fn(function* ({ email, requestKind }: GrantRef) {
  const grants = yield* listPrivacyGrantsByRequestKind({ email, requestKind });
  for (const grant of grants) yield* deletePrivacyGrant(grant._id);
});

// REPLACE ---------------------------------------------------------------------------------------------------------------------------------
export const replacePrivacyGrant = E.fn(function* ({ email, ...create }: PrivacyGrants["Create"]) {
  const writer = yield* DatabaseWriter;
  const secret = yield* Config.string("SUPPRESSION_HASH_SECRET").pipe(E.orDie);
  const subjectHash = yield* hashCanonicalEmail({ email, secret });
  yield* revokePrivacyGrant({ email, requestKind: create.requestKind });
  return yield* writer
    .table("privacyGrants")
    .insert({ ...create, subjectHash })
    .pipe(dieOnEncodeError);
});

// CONSUME ---------------------------------------------------------------------------------------------------------------------------------
export const consumePrivacyGrant = E.fn(function* ({ email, now, requestKind }: WithNow<GrantRef>) {
  const grant = yield* getPrivacyGrant({ email, requestKind });
  if (O.isNone(grant) || grant.value.expiresAt <= now) throw new ConvexError("PRIVACY_GRANT_REQUIRED");
  yield* deletePrivacyGrant(grant.value._id);
  return grant.value.verificationAuditId;
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type GrantRef = { email: string; requestKind: PrivacyAudits["RequestKind"] };
