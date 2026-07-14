import { requireLegalText } from "../data/legal-texts";
import { requireActiveNewsletterLegalBundle } from "../data/newsletter-legal-bundles";
import { zQuery } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const requireActive = zQuery({
  args: {},
  handler: async (ctx) => {
    const bundle = await requireActiveNewsletterLegalBundle(ctx);
    const privacyNotice = await requireLegalText(ctx, bundle.privacyNoticeId);
    const newsletterConsent = await requireLegalText(ctx, bundle.newsletterConsentId);
    return { ...bundle, newsletterConsent, privacyNotice };
  },
});
