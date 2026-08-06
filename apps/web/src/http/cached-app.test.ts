import { CACHE_HEADER, CACHE_ROUTE_HEADERS } from "@ec/http/cache-policy";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CachedApp } from "./cached-app";

const state = vi.hoisted(() => ({
  handlerFetch: vi.fn<(request: Request) => Promise<Response>>(),
}));

vi.mock(import("@tanstack/react-start/server-entry"), () => ({
  default: {
    fetch: state.handlerFetch,
  },
}));

// @ts-expect-error The narrow test adapter intentionally omits unrelated Cloudflare runtime behavior.
vi.mock(import("cloudflare:workers"), () => ({
  // oxlint-disable-next-line typescript/no-extraneous-class
  WorkerEntrypoint: class {},
  env: {
    CSP_MODE: "report-only",
  },
}));

describe("cached public app", () => {
  beforeEach(() => {
    state.handlerFetch.mockReset();
  });

  it("applies deterministic security and cache policy to rendered HTML", async () => {
    state.handlerFetch.mockResolvedValue(
      new Response("page", {
        headers: {
          "content-type": "text/html",
          ...CACHE_ROUTE_HEADERS.publicHtml,
        },
      })
    );

    const app = Object.create(CachedApp.prototype) as CachedApp;

    const response = await app.fetch(new Request("https://elianacorre.com/"));

    expect(response.headers.get("content-security-policy-report-only")).toContain("default-src 'self'");

    expect(response.headers.get(CACHE_HEADER.edgeControl)).toContain("public");

    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
