import type { Id } from "@ec/backend/types";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";
import { Config, Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError, dieOnPatchError, optionById } from "./confect";

export const getPrivacyAudit = E.fn(function* (id: Id<"privacyAudits">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("privacyAudits").get(id).pipe(optionById);
});

// TRANSFORMS ------------------------------------------------------------------------------------------------------------------------------
export const privacyAuditFromDoc = ({ subjectHash: _, ...entry }: PrivacyAudits["Doc"]): PrivacyAudits["Entry"] => entry;

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listPrivacyAuditsByEmail = E.fn(function* (email: string) {
  const reader = yield* DatabaseReader;
  const secret = yield* Config.string("SUPPRESSION_HASH_SECRET").pipe(E.orDie);
  const subjectHash = yield* hashCanonicalEmail({ email, secret });
  const docs = yield* reader
    .table("privacyAudits")
    .index("by_subject_hash", (q) => q.eq("subjectHash", subjectHash), "desc")
    .collect()
    .pipe(dieOnDecodeError);
  return docs.map(privacyAuditFromDoc);
});

export const getPendingPrivacyErasureByEmail = E.fn(function* (email: string) {
  const reader = yield* DatabaseReader;
  const secret = yield* Config.string("SUPPRESSION_HASH_SECRET").pipe(E.orDie);
  const subjectHash = yield* hashCanonicalEmail({ email, secret });
  const audit = yield* reader
    .table("privacyAudits")
    .index("by_subject_hash_kind_outcome", (q) => q.eq("subjectHash", subjectHash).eq("kind", "erasure").eq("outcome", "pending"))
    .first()
    .pipe(dieOnDecodeError);
  return audit;
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createPrivacyAuditRequest = E.fn(function* ({ email, ...create }: PrivacyAudits["RequestCreate"]) {
  const writer = yield* DatabaseWriter;
  const secret = yield* Config.string("SUPPRESSION_HASH_SECRET").pipe(E.orDie);
  const subjectHash = yield* hashCanonicalEmail({ email, secret });
  return yield* writer
    .table("privacyAudits")
    .insert({ ...create, subjectHash })
    .pipe(dieOnEncodeError);
});

export const createPrivacyAuditVerification = E.fn(function* ({ email, ...create }: PrivacyAudits["VerificationCreate"]) {
  const writer = yield* DatabaseWriter;
  const secret = yield* Config.string("SUPPRESSION_HASH_SECRET").pipe(E.orDie);
  const subjectHash = yield* hashCanonicalEmail({ email, secret });
  return yield* writer
    .table("privacyAudits")
    .insert({ ...create, kind: "verification", subjectHash })
    .pipe(dieOnEncodeError);
});

export const completePendingPrivacyErasure = E.fn(function* (privacyAuditId: Id<"privacyAudits">) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("privacyAudits").patch(privacyAuditId, { outcome: "completed" }).pipe(dieOnPatchError);
});
