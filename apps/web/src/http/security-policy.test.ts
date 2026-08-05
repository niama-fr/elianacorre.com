import { CACHE_CONTROL } from "@ec/http/cache-policy";
import { describe, expect, it } from "vitest";

import { applyCachePolicy } from "./cache-policy";
import { applyWebSecurityPolicy, CLOUDFLARE_WEB_ANALYTICS_POLICY, isCsrfProtectedRequest } from "./security-policy";

const request = (pathname: string, init?: RequestInit) => new Request(`https://elianacorre.com${pathname}`, init);

describe("public security policy", () => {
  it("keeps Cloudflare Web Analytics disabled", () => {
    expect(CLOUDFLARE_WEB_ANALYTICS_POLICY).toBe("disabled");
  });

  it("defines a deterministic public CSP without authenticated Convex connections", () => {
    const response = applyWebSecurityPolicy(new Response("page"), "enforce");
    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).not.toContain("convex");
    expect(policy).not.toContain("cloudflareinsights");
  });

  it("uses report-only CSP for capability responses before enforcement approval", () => {
    const response = applyWebSecurityPolicy(new Response("capability"), "report-only");
    const cacheAwareResponse = applyCachePolicy(request("/newsletter/confirmation?token=secret"), response);

    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("content-security-policy-report-only")).toContain("form-action 'self'");
    expect(cacheAwareResponse.headers.get("cache-control")).toBe(CACHE_CONTROL.privateNoStore);
  });

  it.each([
    ["redirect", new Response(null, { headers: { Location: "/" }, status: 303 })],
    ["error", new Response("failure", { status: 500 })],
    ["server function", new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } })],
  ])("preserves the %s response while adding common headers", (_name, sourceResponse) => {
    const response = applyWebSecurityPolicy(sourceResponse, "enforce");

    expect(response.status).toBe(sourceResponse.status);
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each([
    ["server functions", "serverFn", "GET"],
    ["same-origin mutations", "router", "POST"],
    ["same-origin updates", "router", "PATCH"],
    ["same-origin deletes", "router", "DELETE"],
  ] as const)("protects %s with CSRF validation", (_name, handlerType, method) => {
    expect(isCsrfProtectedRequest({ handlerType, request: request("/", { method }) })).toBeTruthy();
  });

  it("does not add CSRF validation to safe router reads", () => {
    expect(isCsrfProtectedRequest({ handlerType: "router", request: request("/") })).toBeFalsy();
  });
});
