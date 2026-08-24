import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { sContactRequestForm } from "./contact-requests.schemas";

describe("contact request form", () => {
  it("normalizes fields at the form boundary", () => {
    expect(
      S.decodeSync(sContactRequestForm)({
        email: "  Reader@Example.COM ",
        firstName: "  Reader  ",
        message: "  Bonjour  ",
        website: "  trap  ",
      })
    ).toStrictEqual({ email: "reader@example.com", firstName: "Reader", message: "Bonjour", website: "trap" });
  });
});
