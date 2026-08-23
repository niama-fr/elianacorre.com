import { createServerFn } from "@tanstack/react-start";
import { Effect as E } from "effect";

import { HttpClientLive } from "@/lib/confect/http-client";

import { executeLegalTextsRequireActivePrivacyNotice } from "./legal-texts.server";

// REQUIRE ACTIVE PRIVACY NOTICE -----------------------------------------------------------------------------------------------------------
export const requireActivePrivacyNotice = createServerFn({ method: "GET" }).handler(
  async () => await E.runPromise(executeLegalTextsRequireActivePrivacyNotice().pipe(E.provide(HttpClientLive)))
);
