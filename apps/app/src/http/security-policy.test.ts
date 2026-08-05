import { applySecurityPolicy, createContentSecurityPolicyNonce } from "@ec/http/security-policy";
import { describe, expect, it } from "vitest";

import {
  CLOUDFLARE_WEB_ANALYTICS_POLICY,
  createAppContentSecurityPolicy,
  createSecurityMiddleware,
  getSecurityNonce,
  isCsrfProtectedRequest,
} from "./security-policy";

const request = (pathname: string, init?: RequestInit) => new Request(`https://app.elianacorre.com${pathname}`, init);
const convexUrl = "https://exact-deployment.convex.cloud";

describe("authenticated security policy", () => {
  it("keeps Cloudflare Web Analytics disabled", () => {
    expect(CLOUDFLARE_WEB_ANALYTICS_POLICY).toBe("disabled");
  });

  it("uses a per-response nonce for generated scripts and authenticated connections", () => {
    const nonce = createContentSecurityPolicyNonce();
    const response = applySecurityPolicy(new Response("page"), {
      contentSecurityPolicy: createAppContentSecurityPolicy({ convexUrl, nonce }),
      mode: "enforce",
    });
    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("https://exact-deployment.convex.cloud");
    expect(policy).toContain("wss://exact-deployment.convex.cloud");
    expect(policy).not.toContain("*.convex");
  });

  it("can report the nonce policy before enforcement approval", () => {
    const response = applySecurityPolicy(new Response("page"), {
      contentSecurityPolicy: createAppContentSecurityPolicy({ convexUrl, nonce: "test-nonce" }),
      mode: "report-only",
    });

    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(response.headers.get("content-security-policy-report-only")).toContain("'nonce-test-nonce'");
  });

  it("reads the response nonce from Start request context", () => {
    expect(getSecurityNonce({ securityNonce: "context-nonce" })).toBe("context-nonce");
    expect(getSecurityNonce({ securityNonce: 123 })).toBeUndefined();
  });

  it("uses one nonce for TanStack request context and the outgoing CSP", async () => {
    const middleware = createSecurityMiddleware({ convexUrl, mode: "enforce" });
    const serverMiddleware = middleware.options.server;
    if (!serverMiddleware) throw new Error("Security middleware has no server handler");
    let downstreamContext: unknown;

    const result = await serverMiddleware({
      context: undefined,
      handlerType: "router",
      // @ts-expect-error The test adapter records TanStack's generic context without narrowing its application type.
      next: (options) => {
        downstreamContext = options?.context;
        return { context: options?.context ?? {}, pathname: "/", request: request("/"), response: new Response("page") };
      },
      pathname: "/",
      request: request("/"),
    });
    if (result instanceof Response) throw new Error("Security middleware returned an unexpected bare response");
    const nonce = getSecurityNonce(downstreamContext);

    expect(nonce).toBeTypeOf("string");
    expect(result.response.headers.get("content-security-policy")).toContain(`'nonce-${nonce}'`);
  });

  it.each([
    ["redirect", new Response(null, { headers: { Location: "/connexion" }, status: 303 })],
    ["error", new Response("failure", { status: 500 })],
    ["server route", new Response('{"ok":true}', { headers: { "Content-Type": "application/json" } })],
  ])("preserves the %s response while adding private security headers", (_name, sourceResponse) => {
    const response = applySecurityPolicy(sourceResponse, {
      contentSecurityPolicy: createAppContentSecurityPolicy({ convexUrl, nonce: "test-nonce" }),
      mode: "enforce",
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
