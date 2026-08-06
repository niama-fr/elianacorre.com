import { CACHE_CONTROL } from "@ec/http/cache-policy";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyCachePolicy } from "./cache-policy";
import { applySecurityPolicy } from "./security-policy";

const testConfig = vi.hoisted(() => ({
  mode: "enforce" as "enforce" | "report-only",
}));

vi.mock(import("@/config/env"), () => ({
  getServerEnv: () => ({
    CSP_MODE: testConfig.mode,
  }),
}));

const request = (pathname: string, init?: RequestInit) => new Request(`https://elianacorre.com${pathname}`, init);

describe("public security policy", () => {
  beforeEach(() => {
    testConfig.mode = "enforce";
  });

  it("defines a deterministic public CSP without authenticated Convex connections", () => {
    const response = applySecurityPolicy(new Response("page"));

    const policy = response.headers.get("content-security-policy");

    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).not.toContain("convex");
    expect(policy).not.toContain("cloudflareinsights");
  });

  it("uses report-only CSP for capability responses before enforcement approval", () => {
    testConfig.mode = "report-only";

    const response = applySecurityPolicy(new Response("capability"));

    const cacheAwareResponse = applyCachePolicy({
      request: request("/newsletter/confirmation?token=secret"),
      response,
    });

    expect(response.headers.get("content-security-policy")).toBeNull();

    expect(response.headers.get("content-security-policy-report-only")).toContain("form-action 'self'");

    expect(cacheAwareResponse.headers.get("cache-control")).toBe(CACHE_CONTROL.privateNoStore);
  });

  it.each([
    [
      "redirect",
      new Response(null, {
        headers: {
          Location: "/",
        },
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
      "server function",
      new Response('{"ok":true}', {
        headers: {
          "Content-Type": "application/json",
        },
      }),
    ],
  ])("preserves the %s response while adding common headers", (_name, sourceResponse) => {
    const response = applySecurityPolicy(sourceResponse);

    expect(response.status).toBe(sourceResponse.status);

    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
