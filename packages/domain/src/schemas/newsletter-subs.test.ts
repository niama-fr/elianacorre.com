import { describe, expect, it } from "vitest";

import { zNewsletterSubUpsert, zNewsletterSubUpsertValues } from "./newsletter-subs";

describe("newsletter subscription", () => {
  it("requires explicit newsletter consent", () => {
    expect(
      zNewsletterSubUpsertValues.safeParse({
        consent: false,
        email: "eliana@example.com",
        website: "",
      }).error?.issues[0]?.message
    ).toBe("Vous devez accepter de recevoir la lettre");
  });

  it("accepts an empty honeypot field in the server payload", () => {
    expect(
      zNewsletterSubUpsert.parse({
        consent: true,
        email: "eliana@example.com",
        firstName: "",
        requestIp: "127.0.0.1",
        website: "",
      })
    ).toMatchObject({
      firstName: undefined,
      requestIp: "127.0.0.1",
      website: "",
    });
  });

  it("trims the honeypot field in the server payload", () => {
    expect(
      zNewsletterSubUpsert.parse({
        consent: true,
        email: "eliana@example.com",
        firstName: "Eliana",
        requestIp: "127.0.0.1",
        website: "  trap  ",
      })
    ).toMatchObject({
      requestIp: "127.0.0.1",
      website: "trap",
    });
  });
});
