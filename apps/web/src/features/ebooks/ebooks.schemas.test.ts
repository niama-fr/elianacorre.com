import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { sEbookRecoveryForm } from "./ebooks.schemas";

describe("e-book recovery form", () => {
  it("normalizes email and honeypot values at the form boundary", () => {
    expect(S.decodeSync(sEbookRecoveryForm)({ email: "  Reader@Example.COM ", website: "  trap  " })).toStrictEqual({
      email: "reader@example.com",
      website: "trap",
    });
  });
});
