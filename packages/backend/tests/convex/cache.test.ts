import { PRIVACY_NOTICE_REVALIDATION_PATH } from "@ec/http/cache-revalidation";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "./test.setup";

describe("privacy-notice cache revalidation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("skips safely when the shared secret is not configured", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const result = await convexTest(schema, modules).action(internal.cache.revalidatePrivacyNotice, {});

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the environment-matched public Worker with the shared secret", async () => {
    vi.stubEnv("CACHE_REVALIDATION_SECRET", "cache-secret");
    vi.stubEnv("SITE_URL", "https://staging.elianacorre.com");

    let request: { authorization: string | null; method: string | undefined; url: string } | null = null;
    const fetchMock = vi.fn<(...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>>(async (input, init) => {
      request = {
        authorization: new Headers(init?.headers).get("authorization"),
        method: init?.method,
        url: input instanceof Request ? input.url : input.toString(),
      };

      return await Promise.resolve(new Response(null, { status: 200 }));
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await convexTest(schema, modules).action(internal.cache.revalidatePrivacyNotice, {});

    expect(result).toStrictEqual({ status: "revalidated" });
    expect(request).toStrictEqual({
      authorization: "Bearer cache-secret",
      method: "POST",
      url: `https://staging.elianacorre.com${PRIVACY_NOTICE_REVALIDATION_PATH}`,
    });
  });

  it("reports a failed Worker invalidation", async () => {
    vi.stubEnv("CACHE_REVALIDATION_SECRET", "cache-secret");
    vi.stubEnv("SITE_URL", "https://elianacorre.com");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(convexTest(schema, modules).action(internal.cache.revalidatePrivacyNotice, {})).rejects.toThrow(
      "Privacy-notice cache revalidation failed with status 503"
    );
  });
});
