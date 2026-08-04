import { describe, expect, it } from "vitest";

import { applySecurityHeaders, SECURITY_HEADERS } from "./security-policy";

describe("public security policy baseline", () => {
  it("defines the existing browser security policy", () => {
    expect(SECURITY_HEADERS["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(SECURITY_HEADERS["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("preserves response status and body", async () => {
    const response = applySecurityHeaders(new Response("missing", { status: 404 }));
    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("missing");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("strict-transport-security")).toContain("includeSubDomains");
  });
});
