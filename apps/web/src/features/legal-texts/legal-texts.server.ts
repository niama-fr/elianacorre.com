import { HttpClient } from "@confect/js";
import refs from "@ec/backend/refs";
import { Effect as E } from "effect";

// REQUIRE ACTIVE PRIVACY NOTICE -----------------------------------------------------------------------------------------------------------
export const executeLegalTextsRequireActivePrivacyNotice = E.fn(function* () {
  const client = yield* HttpClient.HttpClient;
  return yield* client.query(refs.public.legalTexts.requireActivePrivacyNotice, {});
});
