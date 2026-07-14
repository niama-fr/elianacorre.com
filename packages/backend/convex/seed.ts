import { NEWSLETTER_CONSENT, PRIVACY_NOTICE } from "@ec/domain/helpers/legal-texts";
import { zProfileAdminsSeed } from "@ec/domain/schemas/profiles";
import { ConvexError } from "convex/values";

import { getActiveNewsletterConsent, getActivePrivacyNotice } from "../data/legal-texts";
import { getActiveNewsletterLegalBundle } from "../data/newsletter-legal-bundles";
import { getProfileByEmail } from "../data/profiles";
import type { Id } from "./_generated/dataModel";
import { env } from "./_generated/server";
import { zInternalMutation } from "./zod";

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const init = zInternalMutation({
  args: {},
  handler: async (ctx) => {
    const parsed = zProfileAdminsSeed.safeParse(env.WHITELIST_SEED);
    if (!parsed.success) throw new ConvexError("INVALID_WHITELIST_SEED");

    const profileIds: Id<"profiles">[] = [];

    await Promise.all(
      parsed.data.map(async (email) => {
        const existingProfile = await getProfileByEmail(ctx, email);
        profileIds.push(existingProfile?._id ?? (await ctx.db.insert("profiles", { email, role: "admin" })));
      })
    );

    const [publishedBy] = profileIds;
    const publishedAt = Date.now();

    const newsletterConsent = await getActiveNewsletterConsent(ctx);
    const newsletterConsentId =
      newsletterConsent?._id ?? (await ctx.db.insert("legalTexts", { ...NEWSLETTER_CONSENT, publishedAt, publishedBy }));

    const privacyNotice = await getActivePrivacyNotice(ctx);
    const privacyNoticeId = privacyNotice?._id ?? (await ctx.db.insert("legalTexts", { ...PRIVACY_NOTICE, publishedAt, publishedBy }));

    const newsletterLegalBundle = await getActiveNewsletterLegalBundle(ctx);
    if (!newsletterLegalBundle)
      await ctx.db.insert("newsletterLegalBundles", { newsletterConsentId, privacyNoticeId, publishedAt, publishedBy });
  },
});
