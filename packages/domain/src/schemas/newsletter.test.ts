import { describe, expect, it } from "vitest";

import { CURRENT_NEWSLETTER_LEGAL_COPY, parseNewsletterSubscription, zNewsletterSubscriptionValues } from "./newsletter";

describe("newsletter subscription", () => {
  it("normalizes the stored newsletter email", () => {
    expect(
      parseNewsletterSubscription({
        consent: true,
        email: "  Eliana.Corre+Carnet@Example.COM  ",
        firstName: "Eliana",
      })
    ).toStrictEqual({
      email: "eliana.corre+carnet@example.com",
      firstName: "Eliana",
    });
  });

  it("treats a blank optional first name as absent", () => {
    expect(
      parseNewsletterSubscription({
        consent: true,
        email: "eliana@example.com",
        firstName: "   ",
      })
    ).toStrictEqual({
      email: "eliana@example.com",
    });
  });

  it("exposes immutable initial French legal copy", () => {
    expect({
      consentContentMatchesText: CURRENT_NEWSLETTER_LEGAL_COPY.consent.content === CURRENT_NEWSLETTER_LEGAL_COPY.consent.text,
      consentType: CURRENT_NEWSLETTER_LEGAL_COPY.consent.type,
      isConsentFrozen: Object.isFrozen(CURRENT_NEWSLETTER_LEGAL_COPY.consent),
      isCopyFrozen: Object.isFrozen(CURRENT_NEWSLETTER_LEGAL_COPY),
      isPrivacyFrozen: Object.isFrozen(CURRENT_NEWSLETTER_LEGAL_COPY.privacy),
      privacyContentMatchesText: CURRENT_NEWSLETTER_LEGAL_COPY.privacy.content === CURRENT_NEWSLETTER_LEGAL_COPY.privacy.text,
      privacyType: CURRENT_NEWSLETTER_LEGAL_COPY.privacy.type,
    }).toStrictEqual({
      consentContentMatchesText: true,
      consentType: "newsletter-consent",
      isConsentFrozen: true,
      isCopyFrozen: true,
      isPrivacyFrozen: true,
      privacyContentMatchesText: true,
      privacyType: "privacy-notice",
    });
  });

  it("requires explicit newsletter consent", () => {
    expect(
      zNewsletterSubscriptionValues.safeParse({
        consent: false,
        email: "eliana@example.com",
      }).error?.issues[0]?.message
    ).toBe("Vous devez accepter de recevoir la lettre");
  });
});
