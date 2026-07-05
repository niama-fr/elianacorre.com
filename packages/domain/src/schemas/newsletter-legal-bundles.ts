import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zLegalText, zLegalTextEntry } from "./legal-texts";
import { zDocCommon } from "./utils";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterLegalBundleFields = z.object({
  newsletterConsentId: zid("legalTexts"),
  privacyNoticeId: zid("legalTexts"),
  publishedAt: z.number().nullable(),
  publishedBy: zid("profiles").nullable(),
});
export const zNewsletterLegalBundleDoc = z.object({ ...zDocCommon("newsletterLegalBundles").shape, ...zNewsletterLegalBundleFields.shape });

export const zNewsletterLegalBundleEntry = zNewsletterLegalBundleDoc.extend({
  newsletterConsent: zLegalTextEntry,
  privacyNotice: zLegalTextEntry,
});

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterLegalBundle = zNewsletterLegalBundleEntry.extend({
  newsletterConsent: zLegalText,
  privacyNotice: zLegalText,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsletterLegalBundles = {
  Doc: z.infer<typeof zNewsletterLegalBundleDoc>;
  Entity: z.infer<typeof zNewsletterLegalBundle>;
  Entry: z.infer<typeof zNewsletterLegalBundleEntry>;
  Fields: z.infer<typeof zNewsletterLegalBundleFields>;
};
