import { beforeEach, describe, expect, it, vi } from "vitest";

import server from "./server";

const serverState = vi.hoisted(() => ({
  cachedFetch: vi.fn<(request: Request) => Promise<Response>>(),
  handlerFetch: vi.fn<(request: Request) => Promise<Response>>(),
  purgePrivacyNotice: vi.fn<() => Promise<boolean>>(),
}));

vi.mock(import("@tanstack/react-start/server-entry"), () => ({
  createServerEntry: <T>(entry: T) => entry,
  default: { fetch: serverState.handlerFetch },
}));
// @ts-expect-error The narrow test adapter intentionally omits unrelated Cloudflare runtime exports.
vi.mock(import("cloudflare:workers"), () => ({
  WorkerEntrypoint: class {
    protected env = {};
  },
  env: { CACHE_REVALIDATION_SECRET: "secret", CSP_MODE: "report-only" },
  exports: { CachedApp: { fetch: serverState.cachedFetch, purgePrivacyNotice: serverState.purgePrivacyNotice } },
}));

describe("public Worker gateway", () => {
  beforeEach(() => {
    serverState.cachedFetch.mockReset();
    serverState.handlerFetch.mockReset();
    serverState.purgePrivacyNotice.mockReset();
  });

  it("delegates anonymous HTML to the cache entrypoint", async () => {
    serverState.cachedFetch.mockResolvedValue(new Response("cached page", { headers: { "content-type": "text/html" } }));

    const response = await server.fetch(new Request("https://elianacorre.com/"));

    await expect(response.text()).resolves.toBe("cached page");
    expect(serverState.cachedFetch).toHaveBeenCalledOnce();
    expect(serverState.handlerFetch).not.toHaveBeenCalled();
  });

  it("secures and disables caching for gateway errors", async () => {
    serverState.handlerFetch.mockRejectedValue(new Error("render failed"));

    const response = await server.fetch(new Request("https://elianacorre.com/failure", { headers: { cookie: "session=value" } }));

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-security-policy-report-only")).toContain("connect-src 'self'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
