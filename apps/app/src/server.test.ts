import { beforeEach, describe, expect, it, vi } from "vitest";

import server from "./server";

const serverState = vi.hoisted(() => ({
  defaultStreamHandler: vi.fn<() => Promise<Response>>(),
  router: { options: { ssr: { defaultSsr: true } } } as { options: { ssr: { defaultSsr?: boolean; nonce?: string } } },
}));

vi.mock(import("@tanstack/react-start"), () => ({ getGlobalStartContext: () => ({ securityNonce: "render-nonce" }) }));
// @ts-expect-error The narrow test adapter intentionally implements only the request-handler seam exercised here.
vi.mock(import("@tanstack/react-start/server"), () => ({
  createStartHandler:
    ({ handler }: { handler: (options: { router: typeof serverState.router }) => Promise<Response> }) =>
    async () =>
      await handler({ router: serverState.router }),
  defaultStreamHandler: serverState.defaultStreamHandler,
}));
vi.mock(import("@tanstack/react-start/server-entry"), () => ({ createServerEntry: <T>(entry: T) => entry }));

describe("authenticated Worker entrypoint", () => {
  beforeEach(() => {
    serverState.defaultStreamHandler.mockReset();
    serverState.router.options.ssr = { defaultSsr: true };
  });

  it("propagates the request nonce through the real render seam", async () => {
    serverState.defaultStreamHandler.mockResolvedValue(new Response("page"));

    const response = await server.fetch(new Request("https://app.elianacorre.com/"));

    expect(serverState.router.options.ssr).toStrictEqual({ defaultSsr: true, nonce: "render-nonce" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("secures and disables caching for uncaught Worker errors", async () => {
    serverState.defaultStreamHandler.mockRejectedValue(new Error("render failed"));

    const response = await server.fetch(new Request("https://app.elianacorre.com/failure"));

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-security-policy-report-only")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
