import { CACHE_HEADER, CACHE_ROUTE_HEADERS } from "@ec/http/cache-policy";
import { describe, expect, it } from "vitest";

import { applyCachePolicy, isPublicCacheCandidate } from "./cache-policy";

const htmlResponse = (init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  if (!headers.has(CACHE_HEADER.intent)) headers.set(CACHE_HEADER.intent, CACHE_ROUTE_HEADERS.publicHtml[CACHE_HEADER.intent]);
  return new Response("<html></html>", { ...init, headers });
};

const readCacheHeaders = (response: Response) => ({
  cacheControl: response.headers.get("cache-control"),
  cacheIntent: response.headers.get(CACHE_HEADER.intent),
  cacheTag: response.headers.get("cache-tag"),
  cloudflareCacheControl: response.headers.get("cloudflare-cdn-cache-control"),
});

const PRIVATE_HEADERS = {
  cacheControl: "private, no-store",
  cacheIntent: null,
  cacheTag: null,
  cloudflareCacheControl: null,
};

describe("public response cache policy", () => {
  it("allows declared public HTML to be shared without allowing browser storage", () => {
    const response = applyCachePolicy(new Request("https://elianacorre.com/"), htmlResponse());

    expect(readCacheHeaders(response)).toStrictEqual({
      cacheControl: "private, no-store",
      cacheIntent: null,
      cacheTag: "privacy-notice",
      cloudflareCacheControl: "public, max-age=3600, stale-while-revalidate=300",
    });
  });

  it.each(["https://elianacorre.com/newsletter/confirmation?token=secret", "https://elianacorre.com/newsletter/ebook?token=secret"])(
    "keeps token-bearing HTML private despite a public route intent at %s",
    (url) => {
      const response = applyCachePolicy(new Request(url), htmlResponse());
      expect(readCacheHeaders(response)).toStrictEqual(PRIVATE_HEADERS);
    }
  );

  it.each(["/newsletter/confirmation", "/newsletter/confirmation/", "/newsletter/ebook", "/newsletter/ebook/"])(
    "keeps private capability HTML private despite a public route intent at %s",
    (pathname) => {
      const response = applyCachePolicy(new Request(`https://elianacorre.com${pathname}`), htmlResponse());
      expect(readCacheHeaders(response)).toStrictEqual(PRIVATE_HEADERS);
    }
  );

  it.each(["/newsletter/confirmation", "/newsletter/ebook"])("honors the private route intent at %s", (pathname) => {
    const sourceResponse = htmlResponse({ headers: CACHE_ROUTE_HEADERS.private });
    const response = applyCachePolicy(new Request(`https://elianacorre.com${pathname}`), sourceResponse);
    expect(readCacheHeaders(response)).toStrictEqual(PRIVATE_HEADERS);
  });

  it("keeps undeclared HTML private", () => {
    const sourceResponse = new Response("<html></html>", { headers: { "Content-Type": "text/html" } });
    const response = applyCachePolicy(new Request("https://elianacorre.com/undeclared"), sourceResponse);
    expect(readCacheHeaders(response)).toStrictEqual(PRIVATE_HEADERS);
  });

  it("keeps cookie-dependent HTML private", () => {
    const request = new Request("https://elianacorre.com/", { headers: { Cookie: "form-state=private" } });
    const response = applyCachePolicy(request, htmlResponse());
    expect(readCacheHeaders(response)).toStrictEqual(PRIVATE_HEADERS);
  });

  it.each([
    [
      "authorization-bearing requests",
      new Request("https://elianacorre.com/", { headers: { Authorization: "Bearer secret" } }),
      htmlResponse(),
    ],
    ["responses that set cookies", new Request("https://elianacorre.com/"), htmlResponse({ headers: { "Set-Cookie": "state=private" } })],
  ])("keeps %s private", (_name, request, sourceResponse) => {
    const response = applyCachePolicy(request, sourceResponse);
    expect(readCacheHeaders(response)).toStrictEqual(PRIVATE_HEADERS);
  });

  it.each(["/robots.txt", "/sitemap.xml"])("preserves declared discovery caching for %s", (pathname) => {
    const sourceResponse = new Response("discovery", { headers: CACHE_ROUTE_HEADERS.publicDiscovery });
    const response = applyCachePolicy(new Request(`https://elianacorre.com${pathname}`), sourceResponse);

    expect(readCacheHeaders(response)).toStrictEqual({
      cacheControl: "public, max-age=3600, stale-while-revalidate=86400",
      cacheIntent: null,
      cacheTag: null,
      cloudflareCacheControl: "public, max-age=3600, stale-while-revalidate=86400",
    });
  });

  it.each(["/robots.txt?token=secret", "/newsletter/ebook/"])("keeps unsafe discovery requests private at %s", (pathname) => {
    const sourceResponse = new Response("discovery", { headers: CACHE_ROUTE_HEADERS.publicDiscovery });
    const response = applyCachePolicy(new Request(`https://elianacorre.com${pathname}`), sourceResponse);

    expect(readCacheHeaders(response)).toStrictEqual(PRIVATE_HEADERS);
  });

  it.each([
    ["POST requests", new Request("https://elianacorre.com/_server", { method: "POST" }), htmlResponse()],
    ["redirects", new Request("https://elianacorre.com/"), new Response(null, { headers: { Location: "/" }, status: 303 })],
    ["errors", new Request("https://elianacorre.com/missing"), htmlResponse({ status: 404 })],
    ["non-HTML responses", new Request("https://elianacorre.com/feed.xml"), new Response("feed")],
  ])("keeps %s private", (_name, request, sourceResponse) => {
    const response = applyCachePolicy(request, sourceResponse);
    expect(readCacheHeaders(response)).toStrictEqual(PRIVATE_HEADERS);
  });
});

describe("public cache gateway", () => {
  it("forwards anonymous reads to the cached entrypoint", () => {
    expect(isPublicCacheCandidate(new Request("https://elianacorre.com/"))).toBeTruthy();
    expect(isPublicCacheCandidate(new Request("https://elianacorre.com/robots.txt", { method: "HEAD" }))).toBeTruthy();
    expect(isPublicCacheCandidate(new Request("https://elianacorre.com/oeuvres/un-roman"))).toBeTruthy();
  });

  it.each([
    ["cookie-bearing requests", new Request("https://elianacorre.com/", { headers: { Cookie: "state=private" } })],
    ["authorization-bearing requests", new Request("https://elianacorre.com/", { headers: { Authorization: "Bearer secret" } })],
    ["mutations", new Request("https://elianacorre.com/", { method: "POST" })],
    ["token query parameters", new Request("https://elianacorre.com/?token=secret")],
    ["tracking query parameters", new Request("https://elianacorre.com/?utm_source=newsletter")],
    ["unknown application paths", new Request("https://elianacorre.com/api/future")],
    ["newsletter confirmations", new Request("https://elianacorre.com/newsletter/confirmation")],
    ["newsletter confirmations with a trailing slash", new Request("https://elianacorre.com/newsletter/confirmation/")],
    ["ebook capabilities", new Request("https://elianacorre.com/newsletter/ebook")],
    ["ebook capabilities with a trailing slash", new Request("https://elianacorre.com/newsletter/ebook/")],
  ])("keeps %s on the uncached entrypoint", (_, request) => {
    expect(isPublicCacheCandidate(request)).toBeFalsy();
  });
});
