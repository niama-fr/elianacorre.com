import { CACHE_CONTROL } from "@ec/http/cache-policy";
import { describe, expect, it } from "vitest";

import { applyCachePolicy } from "./cache-policy";
import {
  applySecurityHeaders,
  CLOUDFLARE_WEB_ANALYTICS_POLICY,
  isCsrfProtectedRequest,
  resolveSecurityPolicyMode,
} from "./security-policy";

const request = (pathname: string, init?: RequestInit) => new Request(`https://elianacorre.com${pathname}`, init);

describe("public security policy", () => {
  it("keeps Cloudflare Web Analytics disabled", () => {
    expect(CLOUDFLARE_WEB_ANALYTICS_POLICY).toBe("disabled");
  });

  it("accepts only the documented CSP modes", () => {
    expect(resolveSecurityPolicyMode()).toBe("report-only");
    expect(resolveSecurityPolicyMode("report-only")).toBe("report-only");
    expect(resolveSecurityPolicyMode("enforce")).toBe("enforce");
    expect(() => resolveSecurityPolicyMode("unexpected")).toThrow("Unsupported CSP_MODE value");
  });

  it("defines a deterministic public CSP without authenticated Convex connections", () => {
    const response = applySecurityHeaders(request("/"), new Response("page"), "enforce");
    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).not.toContain("convex");
    expect(policy).not.toContain("cloudflareinsights");
  });

  it("uses report-only CSP for capability responses before enforcement approval", () => {
    const response = applySecurityHeaders(request("/newsletter/confirmation?token=secret"), new Response("capability"), "report-only");
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
    const response = applySecurityHeaders(request("/_server"), sourceResponse, "enforce");

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
