import { describe, expect, it, vi } from "vitest";

import { handlePrivacyNoticeRevalidation, PRIVACY_NOTICE_REVALIDATION_PATH } from "./cache-revalidation";

const createRequest = (init?: RequestInit) => new Request(`https://elianacorre.com${PRIVACY_NOTICE_REVALIDATION_PATH}`, init);

describe("privacy-notice cache revalidation", () => {
  it("ignores unrelated paths", async () => {
    const purge = vi.fn<() => Promise<boolean>>();

    await expect(
      handlePrivacyNoticeRevalidation({ purge, request: new Request("https://elianacorre.com/"), secret: "secret" })
    ).resolves.toBeNull();
    expect(purge).not.toHaveBeenCalled();
  });

  it("accepts only POST requests", async () => {
    const purge = vi.fn<() => Promise<boolean>>();

    const methodNotAllowed = await handlePrivacyNoticeRevalidation({ purge, request: createRequest(), secret: "secret" });

    expect(methodNotAllowed?.status).toBe(405);
    expect(methodNotAllowed?.headers.get("allow")).toBe("POST");
    expect(methodNotAllowed?.headers.get("cache-control")).toBe("private, no-store");
    expect(purge).not.toHaveBeenCalled();
  });

  it("requires the configured bearer secret", async () => {
    const purge = vi.fn<() => Promise<boolean>>();
    const unauthorized = await handlePrivacyNoticeRevalidation({
      purge,
      request: createRequest({ method: "POST" }),
      secret: "secret",
    });
    const invalidBearer = await handlePrivacyNoticeRevalidation({
      purge,
      request: createRequest({ headers: { Authorization: "Bearer wrong" }, method: "POST" }),
      secret: "secret",
    });

    expect(unauthorized?.status).toBe(401);
    expect(unauthorized?.headers.get("cache-control")).toBe("private, no-store");
    expect(unauthorized?.headers.get("www-authenticate")).toBe("Bearer");
    expect(invalidBearer?.status).toBe(401);
    expect(purge).not.toHaveBeenCalled();
  });

  it("purges tagged responses after authentication", async () => {
    const purge = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    const request = createRequest({ headers: { Authorization: "Bearer secret" }, method: "POST" });

    const response = await handlePrivacyNoticeRevalidation({ purge, request, secret: "secret" });

    expect(response?.status).toBe(200);
    expect(response?.headers.get("cache-control")).toBe("private, no-store");
    await expect(response?.json()).resolves.toStrictEqual({ revalidated: true });
    expect(purge).toHaveBeenCalledOnce();
  });

  it("reports a rejected purge as a failure", async () => {
    const request = createRequest({ headers: { Authorization: "Bearer secret" }, method: "POST" });
    const response = await handlePrivacyNoticeRevalidation({
      purge: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
      request,
      secret: "secret",
    });

    expect(response?.status).toBe(500);
    expect(response?.headers.get("cache-control")).toBe("private, no-store");
    await expect(response?.json()).resolves.toStrictEqual({ revalidated: false });
  });

  it("reports a thrown purge error without exposing its details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(vi.fn());
    const request = createRequest({ headers: { Authorization: "Bearer secret" }, method: "POST" });
    const response = await handlePrivacyNoticeRevalidation({
      purge: vi.fn<() => Promise<boolean>>().mockRejectedValue(new Error("sensitive Cloudflare error")),
      request,
      secret: "secret",
    });

    expect(response?.status).toBe(500);
    expect(response?.headers.get("cache-control")).toBe("private, no-store");
    await expect(response?.json()).resolves.toStrictEqual({ revalidated: false });
    expect(consoleError).toHaveBeenCalledWith(
      JSON.stringify({ error: "sensitive Cloudflare error", message: "Privacy notice revalidation failed" })
    );
    consoleError.mockRestore();
  });
});
