import type { Id } from "@ec/backend/types";
import { PrivacyNoticeNotFound } from "@ec/domain/errors/legal-texts";
import type { LegalTexts } from "@ec/domain/schemas/legal-texts";
import { Effect as E, Option as O } from "effect";

import type { LegalTextsDoc } from "../confect/_generated/docs";
import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError, optionById } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getPrivacyNotice = E.fn(function* (id: Id<"legalTexts">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("legalTexts")
    .get(id)
    .pipe(optionById, E.map(O.filter((doc) => doc.kind === "privacyNotice")));
});

export const getActivePrivacyNotice = E.fn(function* () {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("legalTexts")
    .index("by_kind_and_published_at", (q) => q.eq("kind", "privacyNotice"), "desc")
    .first()
    .pipe(dieOnDecodeError);
});

export const getPrivacyNoticeAt = E.fn(function* (occurredAt: number) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("legalTexts")
    .index("by_kind_and_published_at", (q) => q.eq("kind", "privacyNotice").lte("publishedAt", occurredAt), "desc")
    .first()
    .pipe(dieOnDecodeError);
});

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
const requirePrivacyNoticeFrom = <F, R>(effect: E.Effect<O.Option<LegalTextsDoc>, F, R>) =>
  E.flatMap(
    effect,
    O.match({
      onNone: () => new PrivacyNoticeNotFound(),
      onSome: E.succeed,
    })
  );

export const requireActivePrivacyNotice = E.fn(() => requirePrivacyNoticeFrom(getActivePrivacyNotice()));
export const requirePrivacyNoticeAt = E.fn((occurredAt: number) => requirePrivacyNoticeFrom(getPrivacyNoticeAt(occurredAt)));
export const requirePrivacyNotice = E.fn((id: Id<"legalTexts">) => requirePrivacyNoticeFrom(getPrivacyNotice(id)));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createPrivacyNotice = E.fn(function* (create: Omit<LegalTexts["Create"], "kind">) {
  const writer = yield* DatabaseWriter;
  return yield* writer
    .table("legalTexts")
    .insert({ ...create, kind: "privacyNotice" })
    .pipe(dieOnEncodeError);
});
