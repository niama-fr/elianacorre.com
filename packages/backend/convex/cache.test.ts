import { PRIVACY_NOTICE_REVALIDATION_PATH } from "@ec/http/cache-revalidation";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";
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

    expect(result).toStrictEqual({ status: "skipped" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the environment-matched public Worker with the shared secret", async () => {
    vi.stubEnv("CACHE_REVALIDATION_SECRET", "cache-secret");
    vi.stubEnv("SITE_URL", "https://staging.elianacorre.com");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await convexTest(schema, modules).action(internal.cache.revalidatePrivacyNotice, {});

    expect(result).toStrictEqual({ status: "revalidated" });
    expect(fetchMock).toHaveBeenCalledWith(`https://staging.elianacorre.com${PRIVACY_NOTICE_REVALIDATION_PATH}`, {
      headers: { Authorization: "Bearer cache-secret" },
      method: "POST",
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
