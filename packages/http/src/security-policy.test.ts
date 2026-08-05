import { describe, expect, it } from "vitest";

import {
  applySecurityPolicy,
  createContentSecurityPolicyNonce,
  isCsrfProtectedRequest,
  resolveSecurityPolicyMode,
  serializeContentSecurityPolicy,
} from "./security-policy";

describe("HTTP security policy", () => {
  it("applies the selected CSP mode without changing the response", async () => {
    const sourceResponse = new Response("failure", { headers: { Location: "/connexion" }, status: 500 });

    const response = applySecurityPolicy(sourceResponse, {
      contentSecurityPolicy: "default-src 'self'; object-src 'none'",
      mode: "report-only",
    });

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("failure");
    expect(response.headers.get("location")).toBe("/connexion");
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("content-security-policy-report-only")).toBe("default-src 'self'; object-src 'none'");
  });

  it("preserves writable response identity and platform metadata", () => {
    const response = new Response("page");

    expect(applySecurityPolicy(response)).toBe(response);
  });

  it("identifies requests that need CSRF validation", () => {
    expect(isCsrfProtectedRequest({ handlerType: "router", request: new Request("https://example.com", { method: "POST" }) })).toBeTruthy();
    expect(isCsrfProtectedRequest({ handlerType: "serverFn", request: new Request("https://example.com") })).toBeTruthy();
    expect(isCsrfProtectedRequest({ handlerType: "router", request: new Request("https://example.com") })).toBeFalsy();
  });

  it("applies common security headers to every response class", () => {
    const response = applySecurityPolicy(new Response(null, { status: 303 }));

    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });

  it("serializes valued and valueless CSP directives deterministically", () => {
    expect(
      serializeContentSecurityPolicy({
        "default-src": ["'self'"],
        "object-src": ["'none'"],
        "upgrade-insecure-requests": true,
      })
    ).toBe("default-src 'self'; object-src 'none'; upgrade-insecure-requests");
  });

  it("fails closed for unsupported deployment modes", () => {
    expect(resolveSecurityPolicyMode()).toBe("report-only");
    expect(resolveSecurityPolicyMode("enforce")).toBe("enforce");
    expect(() => resolveSecurityPolicyMode("disabled")).toThrow("Unsupported CSP_MODE value");
  });

  it("generates distinct base64 nonces with 128 bits of randomness", () => {
    const firstNonce = createContentSecurityPolicyNonce();
    const secondNonce = createContentSecurityPolicyNonce();

    expect(firstNonce).not.toBe(secondNonce);
    expect(Uint8Array.from(atob(firstNonce), (character) => character.codePointAt(0) ?? 0)).toHaveLength(16);
  });
});
