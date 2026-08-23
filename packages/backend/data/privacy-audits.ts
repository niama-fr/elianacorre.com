import { env } from "@ec/backend/server";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError } from "./confect";

// TRANSFORMS ------------------------------------------------------------------------------------------------------------------------------
export const privacyAuditFromDoc = ({ subjectHash: _, ...entry }: PrivacyAudits["Doc"]): PrivacyAudits["Entry"] => entry;

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const listPrivacyAuditsByEmail = E.fn(function* (email: string) {
  const reader = yield* DatabaseReader;
  const subjectHash = yield* hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  const docs = yield* reader
    .table("privacyAudits")
    .index("by_subject_hash", (q) => q.eq("subjectHash", subjectHash), "desc")
    .collect()
    .pipe(dieOnDecodeError);
  return docs.map(privacyAuditFromDoc);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createPrivacyAuditRequest = E.fn(function* ({ email, ...create }: PrivacyAudits["RequestCreate"]) {
  const writer = yield* DatabaseWriter;
  const subjectHash = yield* hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return yield* writer
    .table("privacyAudits")
    .insert({ ...create, subjectHash })
    .pipe(dieOnEncodeError);
});

export const createPrivacyAuditVerification = E.fn(function* ({ email, ...create }: PrivacyAudits["VerificationCreate"]) {
  const writer = yield* DatabaseWriter;
  const subjectHash = yield* hashCanonicalEmail({ email, secret: env.SUPPRESSION_HASH_SECRET });
  return yield* writer
    .table("privacyAudits")
    .insert({ ...create, kind: "verification", subjectHash })
    .pipe(dieOnEncodeError);
});
