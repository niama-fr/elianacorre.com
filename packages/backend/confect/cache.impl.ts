import { FunctionImpl, GroupImpl } from "@confect/server";
import { PRIVACY_NOTICE_REVALIDATION_PATH } from "@ec/http/cache-revalidation";
import { Config, Effect as E, Layer as L, Option as O, Schema as S } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";

import databaseSchema from "./_generated/schema";
import spec from "./cache.spec";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const sPublicSiteUrl = S.URLFromString.check(
  S.makeFilter(({ hostname }) => (["localhost", "127.0.0.1", "::1"].includes(hostname) ? "Expected a public site URL" : undefined))
);

// INTERNAL ACTIONS ------------------------------------------------------------------------------------------------------------------------
const revalidatePrivacyNotice = FunctionImpl.make(databaseSchema, spec, "revalidatePrivacyNotice", () =>
  E.gen(function* () {
    const siteUrlConfig = yield* Config.option(Config.string("SITE_URL")).pipe(E.orDie);
    if (O.isNone(siteUrlConfig)) return null;

    const siteUrl = S.decodeOption(sPublicSiteUrl)(siteUrlConfig.value);
    if (O.isNone(siteUrl)) return null;

    const secret = yield* Config.option(Config.string("CACHE_REVALIDATION_SECRET")).pipe(E.orDie);
    if (O.isNone(secret) || secret.value.length === 0) return null;

    const client = yield* HttpClient.HttpClient;
    const response = yield* client
      .execute(
        HttpClientRequest.post(new URL(PRIVACY_NOTICE_REVALIDATION_PATH, siteUrl.value)).pipe(HttpClientRequest.bearerToken(secret.value))
      )
      .pipe(E.orDie);

    if (response.status < 200 || response.status >= 300)
      return yield* E.die(new Error(`Privacy-notice cache revalidation failed with status ${response.status}`));

    return { status: "revalidated" as const };
  }).pipe(E.provide(FetchHttpClient.layer), E.provideService(FetchHttpClient.Fetch, globalThis.fetch))
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(L.provide(revalidatePrivacyNotice), GroupImpl.finalize);
