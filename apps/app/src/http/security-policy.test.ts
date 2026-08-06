import { createContentSecurityPolicyNonce } from "@ec/http/security-policy";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applySecurityPolicy, createSecurityMiddleware, SECURITY_NONCE_CONTEXT_KEY } from "./security-policy";

const testConfig = vi.hoisted(() => ({
  convexSiteUrl: "https://exact-deployment.convex.site",
  convexUrl: "https://exact-deployment.convex.cloud",
  mode: "enforce" as "enforce" | "report-only",
}));

vi.mock(import("@/config/env"), () => ({
  getServerEnv: () => ({
    CSP_MODE: testConfig.mode,
  }),
  publicEnv: {
    VITE_CONVEX_SITE_URL: testConfig.convexSiteUrl,
    VITE_CONVEX_URL: testConfig.convexUrl,
  },
}));

const request = (pathname: string, init?: RequestInit) => new Request(`https://app.elianacorre.com${pathname}`, init);

describe("authenticated security policy", () => {
  beforeEach(() => {
    testConfig.mode = "enforce";
  });

  it("uses a per-response nonce for generated scripts and authenticated connections", () => {
    const nonce = createContentSecurityPolicyNonce();
    const response = applySecurityPolicy(new Response("page"), nonce);
    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("https://exact-deployment.convex.cloud");
    expect(policy).toContain("wss://exact-deployment.convex.cloud");
    expect(policy).not.toContain("*.convex");
  });

  it("can report the nonce policy before enforcement approval", () => {
    testConfig.mode = "report-only";

    const response = applySecurityPolicy(new Response("page"), "test-nonce");

    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("content-security-policy-report-only")).toContain("'nonce-test-nonce'");
  });

  it("uses one nonce for TanStack request context and the outgoing CSP", async () => {
    const middleware = createSecurityMiddleware();
    const serverMiddleware = middleware.options.server;

    if (!serverMiddleware) throw new Error("Security middleware has no server handler");

    let downstreamContext: unknown;

    const result = await serverMiddleware({
      context: undefined,
      handlerType: "router",

      // @ts-expect-error The test manually invokes TanStack's generic middleware adapter without its inferred application context.
      next: (options) => {
        downstreamContext = options?.context;

        return {
          context: options?.context ?? {},
          pathname: "/",
          request: request("/"),
          response: new Response("page"),
        };
      },

      pathname: "/",
      request: request("/"),
    });

    if (result instanceof Response) throw new Error("Security middleware returned an unexpected bare response");

    if (typeof downstreamContext !== "object" || downstreamContext === null)
      throw new Error("Security middleware did not provide a valid context");

    const nonce = (downstreamContext as Record<PropertyKey, unknown>)[SECURITY_NONCE_CONTEXT_KEY];

    expect(nonce).toBeTypeOf("string");

    if (typeof nonce !== "string") throw new Error("Security middleware did not provide a nonce");

    expect(result.response.headers.get("content-security-policy")).toContain(`'nonce-${nonce}'`);

    expect(result.response.headers.get("content-security-policy")).toContain(testConfig.convexUrl);
  });

  it.each([
    [
      "redirect",
      new Response(null, {
        headers: { Location: "/connexion" },
        status: 303,
      }),
    ],
    [
      "error",
      new Response("failure", {
        status: 500,
      }),
    ],
    [
      "server route",
      new Response('{"ok":true}', {
        headers: {
          "Content-Type": "application/json",
        },
      }),
    ],
  ])("preserves the %s response while adding private security headers", (_name, sourceResponse) => {
    const response = applySecurityPolicy(sourceResponse, "test-nonce");

    expect(response.status).toBe(sourceResponse.status);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
