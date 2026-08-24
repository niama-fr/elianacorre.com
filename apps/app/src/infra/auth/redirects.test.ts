import { describe, expect, it } from "vitest";

import { getAuthenticatedLanding, getSafeAuthRedirect } from "./redirects";

describe(getAuthenticatedLanding, () => {
  it.each([
    ["admin", { to: "/admin/ebooks" }],
    ["member", { to: "/" }],
    ["contact", { to: "/acces-refuse" }],
  ] as const)("returns the expected landing for %s", (role, expected) => {
    expect(getAuthenticatedLanding({ role })).toStrictEqual(expected);
  });
});

describe("authenticated redirect validation", () => {
  it("preserves an application-local destination", () => {
    expect(getSafeAuthRedirect("/ebooks?status=draft#latest")).toBe("/ebooks?status=draft#latest");
  });

  it.each([undefined, "ebooks", "https://attacker.example", "//attacker.example", "/\\attacker.example"])(
    "falls back to the application root for an untrusted destination: %s",
    (destination) => {
      expect(getSafeAuthRedirect(destination)).toBe("/");
    }
  );
});
