import type { LegalTexts } from "@ec/domain/schemas/legal-texts";
import { Clock as C, Duration as D, Effect as E } from "effect";

import refs from "../confect/_generated/refs";
import { Scheduler } from "../confect/_generated/services";
import { createPrivacyNotice } from "../data/legal-texts";

// PUBLISH ---------------------------------------------------------------------------------------------------------------------------------
export const publishPrivacyNotice = E.fn(function* (create: Omit<LegalTexts["Create"], "kind" | "publishedAt">) {
  const scheduler = yield* Scheduler;
  const publishedAt = yield* C.currentTimeMillis;

  const privacyNoticeId = yield* createPrivacyNotice({ ...create, publishedAt });

  yield* scheduler.runAfter(D.zero, refs.internal.cache.revalidatePrivacyNotice, {});

  return privacyNoticeId;
});
