import { zNewsSubscriptionUpsert } from "@ec/domain/schemas/news-subscriptions";
import z from "zod";

import { fulfillEbookRequest } from "../ebook-grants";
import { enqueueSendConfirmationEmail, enqueueSyncContact } from "../loops-tasks";
import { NEWS_CONFIRMATION_TTL_MS, getValidNewsConfirmation, replaceNewsConfirmation } from "../news-confirmations";
import { getActiveNewsRestriction, resolveNewsRestriction } from "../news-restrictions";
import {
  createNewsSubscription,
  getActiveNewsSubscription,
  getCurrentNewsSubscription,
  markNewsSubscriptionConfirmed,
  patchNewsSubscription,
} from "../news-subscriptions";
import { getNewsSuppressionByEmail } from "../news-suppressions";
import { requireActiveNewsletterLegalBundle } from "../newsletter-legal-bundles";
import { tryConsumeNewsletterRateLimit } from "../newsletter-rate-limits";
import { createContactProfile, getProfileByEmail } from "../profiles";
import { env } from "./_generated/server";
import { zMutation } from "./zod";

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const confirm = zMutation({
  args: { token: z.string() },
  handler: async (ctx, { token }) => {
    const now = Date.now();
    const confirmation = await getValidNewsConfirmation(ctx, { now, secret: env.CAPABILITY_SIGNING_SECRET, token });
    if (confirmation === null) return { downloadToken: null, status: "invalid" as const };

    const subscription = await ctx.db.get("newsSubscriptions", confirmation.subscriptionId);
    if (subscription === null || subscription.unsubscribedAt !== null) return { downloadToken: null, status: "invalid" as const };
    const profile = await ctx.db.get("profiles", subscription.profileId);
    if (profile === null) return { downloadToken: null, status: "invalid" as const };

    if (confirmation.kind === "confirmSubscription") {
      if (subscription.confirmedAt !== null) return { downloadToken: null, status: "invalid" as const };

      await markNewsSubscriptionConfirmed(ctx, subscription._id, now);
      const restriction = await getActiveNewsRestriction(ctx, subscription.profileId);
      const isEligible =
        restriction === null ||
        (restriction.lastOccurredAt <= confirmation._creationTime &&
          (await resolveNewsRestriction(ctx, { id: restriction._id, now, resolvedBy: "confirmation" })));

      await ctx.db.delete(confirmation._id);
      if (isEligible)
        await enqueueSyncContact(ctx, {
          idempotencyKey: `news-contact-sync:${subscription._id}`,
          profileId: subscription.profileId,
          subscribed: true,
        });

      return {
        downloadToken: await fulfillEbookRequest(ctx, {
          kind: "initial",
          now,
          profileId: subscription.profileId,
          secret: env.CAPABILITY_SIGNING_SECRET,
          sendEmail: isEligible,
        }),
        status: "confirmed" as const,
      };
    }

    if (subscription.confirmedAt === null) return { downloadToken: null, status: "invalid" as const };
    const restored = await resolveNewsRestriction(ctx, {
      expectedVersion: confirmation.expectedRestrictionVersion,
      id: confirmation.restrictionId,
      now,
      resolvedBy: "confirmation",
    });
    await ctx.db.delete(confirmation._id);
    if (!restored) return { downloadToken: null, status: "invalid" as const };

    await enqueueSyncContact(ctx, {
      idempotencyKey: `news-contact-restoration:${confirmation.restrictionId}:${confirmation.expectedRestrictionVersion}`,
      profileId: subscription.profileId,
      subscribed: true,
    });

    return {
      downloadToken: await fulfillEbookRequest(ctx, {
        kind: "replacement",
        now,
        profileId: subscription.profileId,
        secret: env.CAPABILITY_SIGNING_SECRET,
        sendEmail: restored,
      }),
      status: "confirmed" as const,
    };
  },
});

export const upsert = zMutation({
  args: zNewsSubscriptionUpsert,
  handler: async (ctx, { email, firstName, requestIp, website }) => {
    if (website !== "") return { accepted: true as const };
    const suppression = await getNewsSuppressionByEmail(ctx, { email, secret: env.SUPPRESSION_HASH_SECRET });
    if (suppression !== null) return { accepted: true as const };

    const now = Date.now();
    const profile = await getProfileByEmail(ctx, email);
    const currentSubscription = profile ? await getCurrentNewsSubscription(ctx, profile._id) : null;
    const activeSubscription = profile ? await getActiveNewsSubscription(ctx, profile._id) : null;
    const restriction = profile ? await getActiveNewsRestriction(ctx, profile._id) : null;

    if (restriction?.reason === "permanentBounce") return { accepted: true as const };

    if (activeSubscription !== null && profile !== null) {
      if (restriction === null) {
        await fulfillEbookRequest(ctx, {
          kind: "replacement",
          now,
          profileId: profile._id,
          secret: env.CAPABILITY_SIGNING_SECRET,
          sendEmail: true,
        });
        return { accepted: true as const };
      }

      const newsConfirmationId = await replaceNewsConfirmation(ctx, {
        expectedRestrictionVersion: restriction.version,
        expiresAt: now + NEWS_CONFIRMATION_TTL_MS,
        kind: "restoreDelivery",
        restrictionId: restriction._id,
        subscriptionId: activeSubscription._id,
      });
      await enqueueSendConfirmationEmail(ctx, {
        idempotencyKey: `news-delivery-restoration:${newsConfirmationId}`,
        newsConfirmationId,
        profileId: profile._id,
      });
      return { accepted: true as const };
    }

    const isAllowed = await tryConsumeNewsletterRateLimit(ctx, { email, requestIp });
    if (!isAllowed) return { accepted: true as const };

    const profileId = profile?._id ?? (await createContactProfile(ctx, { email, firstName }));
    const { _id: legalBundleId } = await requireActiveNewsletterLegalBundle(ctx);
    const subscriptionId = currentSubscription?._id ?? (await createNewsSubscription(ctx, { legalBundleId, profileId, requestedAt: now }));
    if (currentSubscription) await patchNewsSubscription(ctx, subscriptionId, { legalBundleId, requestedAt: now });

    const newsConfirmationId = await replaceNewsConfirmation(ctx, {
      expiresAt: now + NEWS_CONFIRMATION_TTL_MS,
      kind: "confirmSubscription",
      subscriptionId,
    });
    await enqueueSendConfirmationEmail(ctx, {
      idempotencyKey: `news-confirmation:${newsConfirmationId}`,
      newsConfirmationId,
      profileId,
    });

    return { accepted: true as const };
  },
});
