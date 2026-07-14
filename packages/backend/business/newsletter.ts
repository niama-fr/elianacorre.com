import RateLimiter, { MINUTE } from "@convex-dev/rate-limiter";
import { env, type MutationCtx, type QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import type { WithNow } from "@ec/domain/schemas/utils";

import { components } from "../convex/_generated/api";
import { deleteNewsConfirmation, getNewsConfirmation, replaceNewsConfirmationForSubscription } from "../data/news-confirmations";
import { getActiveNewsRestriction, markNewsRestrictionResolvedByConfirmation } from "../data/news-restrictions";
import {
  createNewsSubscription,
  getCurrentNewsSubscription,
  getNewsSubscription,
  markNewsSubscriptionConfirmed,
  patchNewsSubscription,
} from "../data/news-subscriptions";
import { getNewsSuppressionByEmail } from "../data/news-suppressions";
import { requireActiveNewsletterLegalBundle } from "../data/newsletter-legal-bundles";
import { createContactProfile, getProfile, getProfileIdByEmail } from "../data/profiles";
import { issueInitialEbookDownload, issueReplacementEbookDownload } from "./ebooks";
import { enqueueSendConfirmationEmail, enqueueSyncContactForReactivation, enqueueSyncContactForSubscription } from "./loops";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * MINUTE;

const rateLimiter = new RateLimiter(components.rateLimiter, {
  confirmationRequestByEmail: { kind: "fixed window", period: RATE_LIMIT_WINDOW_MS, rate: 3 },
  confirmationRequestByIp: { kind: "fixed window", period: RATE_LIMIT_WINDOW_MS, rate: 3 },
});

// CONFIRM ---------------------------------------------------------------------------------------------------------------------------------
export async function confirmNewsletter(ctx: MutationCtx, { now, token }: WithNow<{ token: string }>) {
  const confirmation = await resolveConfirmationFromToken(ctx, { now, token });
  if (!confirmation) return { confirmed: false, downloadToken: null };

  const subscription = await getNewsSubscription(ctx, confirmation.subscriptionId);
  if (!subscription || subscription.unsubscribedAt !== null) return { confirmed: false, downloadToken: null };

  const profile = await getProfile(ctx, subscription.profileId);
  if (!profile) return { confirmed: false, downloadToken: null };

  const opts = { now, profileId: profile._id, subscription };

  if (confirmation.kind === "subscription") return await confirmSubscription(ctx, { confirmation, ...opts });
  return await confirmReactivation(ctx, { confirmation, ...opts });
}

// SUBSCRIBE -------------------------------------------------------------------------------------------------------------------------------
export async function subscribeToNewsletter(ctx: MutationCtx, { email, firstName, now, requestIp, website }: SubscribeToNewsletterOpts) {
  if (website !== "" || (await getNewsSuppressionByEmail(ctx, email))) return;

  let profileId = await getProfileIdByEmail(ctx, email);
  const subscription = profileId ? await getCurrentNewsSubscription(ctx, profileId) : null;
  const restriction = profileId ? await getActiveNewsRestriction(ctx, profileId) : null;

  if (restriction?.reason === "permanentBounce") return;

  if (profileId && subscription && subscription.confirmedAt !== null) {
    if (!restriction) {
      await issueReplacementEbookDownload(ctx, { profileId, sendEmail: true });
      return;
    }

    const newsConfirmationId = await replaceNewsConfirmationForSubscription(ctx, {
      kind: "reactivation",
      restrictionId: restriction._id,
      restrictionVersion: restriction.version,
      subscriptionId: subscription._id,
    });
    await enqueueSendConfirmationEmail(ctx, { newsConfirmationId, profileId });

    return;
  }

  if (!(await tryConsumeConfirmationRateLimit(ctx, { email, requestIp }))) return;

  profileId ??= await createContactProfile(ctx, { email, firstName });
  const { _id: legalBundleId } = await requireActiveNewsletterLegalBundle(ctx);
  const subscriptionId = subscription?._id ?? (await createNewsSubscription(ctx, { legalBundleId, profileId, requestedAt: now }));
  if (subscription) await patchNewsSubscription(ctx, subscriptionId, { legalBundleId, requestedAt: now });

  const newsConfirmationId = await replaceNewsConfirmationForSubscription(ctx, {
    kind: "subscription",
    restrictionId: restriction?._id ?? null,
    restrictionVersion: restriction?.version ?? null,
    subscriptionId,
  });
  await enqueueSendConfirmationEmail(ctx, { newsConfirmationId, profileId });
}
type SubscribeToNewsletterOpts = WithNow<{ email: string; firstName?: string; requestIp: string; website: string }>;

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
async function confirmReactivation(ctx: MutationCtx, { confirmation, now, profileId, subscription }: ConfirmReactivationOpts) {
  if (subscription.confirmedAt === null) return { confirmed: false, downloadToken: null };

  const { restrictionId, restrictionVersion } = confirmation;
  const restored = await markNewsRestrictionResolvedByConfirmation(ctx, { now, restrictionId, restrictionVersion });
  await deleteNewsConfirmation(ctx, confirmation._id);
  if (!restored) return { confirmed: false, downloadToken: null };

  await enqueueSyncContactForReactivation(ctx, { confirmation, profileId });
  return { confirmed: true, downloadToken: await issueReplacementEbookDownload(ctx, { profileId, sendEmail: true }) };
}
type ConfirmReactivationOpts = ConfirmOpts & { confirmation: NewsConfirmations["ReactivationDoc"] };

async function confirmSubscription(ctx: MutationCtx, { confirmation, now, profileId, subscription }: ConfirmSubscriptionOpts) {
  if (subscription.confirmedAt !== null) return { confirmed: false, downloadToken: null };

  await markNewsSubscriptionConfirmed(ctx, subscription._id, now);
  const activeRestriction = await getActiveNewsRestriction(ctx, profileId);

  let isEmailDeliveryAllowed = activeRestriction === null;
  if (
    activeRestriction !== null &&
    activeRestriction._id === confirmation.restrictionId &&
    activeRestriction.version === confirmation.restrictionVersion
  )
    isEmailDeliveryAllowed = await markNewsRestrictionResolvedByConfirmation(ctx, {
      now,
      restrictionId: activeRestriction._id,
      restrictionVersion: activeRestriction.version,
    });

  await deleteNewsConfirmation(ctx, confirmation._id);

  if (isEmailDeliveryAllowed) await enqueueSyncContactForSubscription(ctx, { profileId, subscriptionId: subscription._id });
  return { confirmed: true, downloadToken: await issueInitialEbookDownload(ctx, { profileId, sendEmail: isEmailDeliveryAllowed }) };
}
type ConfirmSubscriptionOpts = ConfirmOpts & { confirmation: NewsConfirmations["SubscriptionDoc"] };

async function resolveConfirmationFromToken(ctx: QueryCtx, { now, token }: WithNow<{ token: string }>) {
  const capabilityId = await verifyCapabilityToken({ secret: env.CAPABILITY_SIGNING_SECRET, token });
  const id = capabilityId ? ctx.db.normalizeId("newsConfirmations", capabilityId) : null;
  if (!id) return null;

  const confirmation = await getNewsConfirmation(ctx, id);
  return confirmation && confirmation._creationTime + CONFIRMATION_TTL_MS > now ? confirmation : null;
}

async function tryConsumeConfirmationRateLimit(ctx: MutationCtx, { email, requestIp }: { email: string; requestIp: string }) {
  // Simpler than a coordinated pre-check: each dimension consumes independently.
  const [emailLimit, ipLimit] = await Promise.all([
    rateLimiter.limit(ctx, "confirmationRequestByEmail", { key: email }),
    rateLimiter.limit(ctx, "confirmationRequestByIp", { key: requestIp }),
  ]);
  return emailLimit.ok && ipLimit.ok;
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ConfirmOpts = WithNow<{ profileId: Id<"profiles">; subscription: NewsSubscriptions["Doc"] }>;
