import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { sProfileFields, sProfilePatch } from "./profiles";

describe("profile schemas", () => {
  it("canonicalizes a persisted email and rejects an invalid one", () => {
    expect(S.decodeSync(sProfileFields)({ email: "  Reader@Example.COM ", role: "contact" })).toStrictEqual({
      email: "reader@example.com",
      role: "contact",
    });
    expect(S.is(sProfileFields)({ email: "not-an-email", role: "contact" })).toBeFalsy();
  });

  it("keeps explicit undefined values available for anonymization patches", () => {
    const patch = S.decodeSync(sProfilePatch)({ email: undefined, firstName: undefined });
    expect(Object.hasOwn(patch, "email")).toBeTruthy();
    expect(Object.hasOwn(patch, "firstName")).toBeTruthy();
  });
});
