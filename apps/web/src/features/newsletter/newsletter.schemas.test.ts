import { NEWS_SUBSCRIPTION_ISSUE } from "@ec/domain/schemas/news-subscriptions";
import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { sNewsletterSubscribeForm } from "./newsletter.schemas";

describe("newsletter subscription form", () => {
  it("normalizes values at the form boundary", () => {
    const values = S.decodeUnknownSync(sNewsletterSubscribeForm)({
      consent: true,
      email: "  Reader@Example.COM ",
      firstName: "  Reader  ",
      privacyNoticeId: "k170e5dj9c8heby7eah6c4mr6h7a7tw3",
      website: "  trap  ",
    });

    expect(values).toMatchObject({ email: "reader@example.com", firstName: "Reader", website: "trap" });
  });

  it("requires newsletter consent", () => {
    expect(() =>
      S.decodeUnknownSync(sNewsletterSubscribeForm)({
        consent: false,
        email: "reader@example.com",
        firstName: "",
        privacyNoticeId: "k170e5dj9c8heby7eah6c4mr6h7a7tw3",
        website: "",
      })
    ).toThrow(NEWS_SUBSCRIPTION_ISSUE.consentRequired);
  });
});
