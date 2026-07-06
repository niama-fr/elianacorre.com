import { describe, expect, it } from "vitest";

import { zNewsletterSubCreateValues } from "./newsletter-subs";

describe("newsletter subscription", () => {
  it("requires explicit newsletter consent", () => {
    expect(
      zNewsletterSubCreateValues.safeParse({
        consent: false,
        email: "eliana@example.com",
      }).error?.issues[0]?.message
    ).toBe("Vous devez accepter de recevoir la lettre");
  });
});
