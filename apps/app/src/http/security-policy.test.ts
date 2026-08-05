import { describe, expect, it } from "vitest";

import {
  applySecurityHeaders,
  CLOUDFLARE_WEB_ANALYTICS_POLICY,
  createResponseNonce,
  getSecurityNonce,
  isCsrfProtectedRequest,
} from "./security-policy";

const request = (pathname: string, init?: RequestInit) => new Request(`https://app.elianacorre.com${pathname}`, init);

describe("authenticated security policy", () => {
  it("keeps Cloudflare Web Analytics disabled", () => {
    expect(CLOUDFLARE_WEB_ANALYTICS_POLICY).toBe("disabled");
  });

  it("uses a per-response nonce for generated scripts and authenticated connections", () => {
    const nonce = createResponseNonce();
    const response = applySecurityHeaders(new Response("page"), { mode: "enforce", nonce });
    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toMatch(/https:\/\/\*\.convex\.cloud.*wss:\/\/\*\.convex\.cloud.*wss:\/\/\*\.convex\.site/u);
    expect(response.headers.get("content-security-policy-report-only")).toBeNull();
  });

  it("can report the nonce policy before enforcement approval", () => {
    const response = applySecurityHeaders(new Response("page"), {
      mode: "report-only",
      nonce: "test-nonce",
    });

    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("content-security-policy-report-only")).toContain("'nonce-test-nonce'");
  });

  it("generates distinct base64 nonces with 128 bits of randomness", () => {
    const first = createResponseNonce();
    const second = createResponseNonce();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9+/]{22}==$/u);
    expect(atob(first)).toHaveLength(16);
  });

  it("reads the response nonce from Start request context", () => {
    expect(getSecurityNonce({ securityNonce: "context-nonce" })).toBe("context-nonce");
    expect(getSecurityNonce({ securityNonce: 123 })).toBeUndefined();
  });

  it.each([
    ["redirect", new Response(null, { headers: { Location: "/connexion" }, status: 303 })],
    ["error", new Response("failure", { status: 500 })],
    ["server route", new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } })],
  ])("preserves the %s response while adding private security headers", (_name, sourceResponse) => {
    const response = applySecurityHeaders(sourceResponse, {
      mode: "enforce",
      nonce: "test-nonce",
    });

    expect(response.status).toBe(sourceResponse.status);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it.each([
    ["server functions", "serverFn", "GET"],
    ["auth mutations", "router", "POST"],
    ["auth updates", "router", "PATCH"],
    ["auth deletes", "router", "DELETE"],
  ] as const)("protects %s with CSRF validation", (_name, handlerType, method) => {
    expect(isCsrfProtectedRequest({ handlerType, request: request("/api/auth/sign-out", { method }) })).toBeTruthy();
  });
});
