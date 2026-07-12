import { zNewsSubscriptionUpsert } from "@ec/domain/schemas/news-subscriptions";
import z from "zod";

import { issueReplacementEbookDownload } from "../ebook-issuances";
import {
  getValidNewsConfirmationByToken,
  requestNewsConfirmationReactivation,
  requestNewsConfirmationSubscription,
} from "../news-confirmations";
import { getActiveNewsRestriction } from "../news-restrictions";
import {
  confirmReactivation,
  confirmSubscription,
  createNewsSubscription,
  getCurrentNewsSubscription,
  getNewsSubscription,
  patchNewsSubscription,
} from "../news-subscriptions";
import { getNewsSuppressionByEmail } from "../news-suppressions";
import { requireActiveNewsletterLegalBundle } from "../newsletter-legal-bundles";
import { tryConsumeNewsletterRateLimit } from "../newsletter-rate-limits";
import { createContactProfile, getProfile, getProfileIdByEmail } from "../profiles";
import { zMutation } from "./zod";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const confirm = zMutation({
  args: { token: z.string() },
  handler: async (ctx, { token }) => {
    const now = Date.now();
    const confirmation = await getValidNewsConfirmationByToken(ctx, { now, token });
    if (!confirmation) return { confirmed: false, downloadToken: null };

    const subscription = await getNewsSubscription(ctx, confirmation.subscriptionId);
    if (!subscription || subscription.unsubscribedAt !== null) return { confirmed: false, downloadToken: null };

    const profile = await getProfile(ctx, subscription.profileId);
    if (!profile) return { confirmed: false, downloadToken: null };

    const opts = { now, profileId: profile._id, subscription };

    if (confirmation.kind === "subscription") return await confirmSubscription(ctx, { confirmation, ...opts });
    return await confirmReactivation(ctx, { confirmation, ...opts });
  },
});

export const subscribe = zMutation({
  args: zNewsSubscriptionUpsert,
  handler: async (ctx, { email, firstName, requestIp, website }) => {
    if (website !== "") return { accepted: true as const };
    const suppression = await getNewsSuppressionByEmail(ctx, email);
    if (suppression) return { accepted: true as const };

    let profileId = await getProfileIdByEmail(ctx, email);
    const subscription = profileId ? await getCurrentNewsSubscription(ctx, profileId) : null;
    const restriction = profileId ? await getActiveNewsRestriction(ctx, profileId) : null;

    if (restriction?.reason === "permanentBounce") return { accepted: true as const };

    if (profileId && subscription && subscription.confirmedAt !== null) {
      if (!restriction) {
        await issueReplacementEbookDownload(ctx, { profileId, sendEmail: true });
        return { accepted: true as const };
      }

      await requestNewsConfirmationReactivation(ctx, { profileId, restriction, subscriptionId: subscription._id });
      return { accepted: true as const };
    }

    const isAllowed = await tryConsumeNewsletterRateLimit(ctx, { email, requestIp });
    if (!isAllowed) return { accepted: true as const };

    profileId ??= await createContactProfile(ctx, { email, firstName });
    const { _id: legalBundleId } = await requireActiveNewsletterLegalBundle(ctx);
    const now = Date.now();
    const subscriptionId = subscription?._id ?? (await createNewsSubscription(ctx, { legalBundleId, profileId, requestedAt: now }));
    if (subscription) await patchNewsSubscription(ctx, subscriptionId, { legalBundleId, requestedAt: now });

    await requestNewsConfirmationSubscription(ctx, { profileId, restriction, subscriptionId });
    return { accepted: true as const };
  },
});
