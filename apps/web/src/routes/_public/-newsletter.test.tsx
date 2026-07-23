import { zNewsletterLegalBundle } from "@ec/domain/schemas/newsletter-legal-bundles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NewsletterForm } from "@/routes/_public/-newsletter.form";

const ACTIVE_LEGAL_BUNDLE = zNewsletterLegalBundle.parse({
  _creationTime: 1,
  _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw3",
  newsletterConsent: {
    _creationTime: 1,
    _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw4",
    content: "J’accepte de recevoir la lettre.",
    kind: "newsletterConsent",
    publishedAt: 1,
    publishedBy: null,
  },
  newsletterConsentId: "k170e5dj9c8heby7eah6c4mr6h7a7tw4",
  privacyNotice: {
    _creationTime: 1,
    _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw5",
    content: "Notice de confidentialité.",
    kind: "privacyNotice",
    publishedAt: 1,
    publishedBy: null,
  },
  privacyNoticeId: "k170e5dj9c8heby7eah6c4mr6h7a7tw5",
  publishedAt: 1,
  publishedBy: null,
});

describe("newsletter consent presentation", () => {
  it("embeds the displayed legal bundle identity in the subscription form", () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <NewsletterForm bundle={ACTIVE_LEGAL_BUNDLE} />
      </QueryClientProvider>
    );

    expect(html).toContain(`id="legalBundleId"`);
    expect(html).toContain(`value="${ACTIVE_LEGAL_BUNDLE._id}"`);
  });
});
