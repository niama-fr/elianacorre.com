import { describe, expect, it } from "vitest";

import { hasAdminAccess, hasMemberAccess } from "./profiles";

describe(hasAdminAccess, () => {
  it.each([
    ["admin", true],
    ["member", false],
    ["contact", false],
  ] as const)("returns %s for %s", (role, expected) => {
    expect(hasAdminAccess({ role })).toBe(expected);
  });
});

describe(hasMemberAccess, () => {
  it.each([
    ["admin", false],
    ["member", true],
    ["contact", false],
  ] as const)("returns %s for %s", (role, expected) => {
    expect(hasMemberAccess({ role })).toBe(expected);
  });
});
