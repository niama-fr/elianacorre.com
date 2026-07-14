import RateLimiter, { MINUTE } from "@convex-dev/rate-limiter";
import { env, type MutationCtx, type QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { NewsRestrictions } from "@ec/domain/schemas/news-restrictions";
import type { NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import type { WithNow } from "@ec/domain/schemas/utils";

import { components } from "../convex/_generated/api";
import { createLoopsWebhook, getLoopsWebhookById } from "../data/loops-webhooks";
import { deleteNewsConfirmation, getNewsConfirmation, replaceNewsConfirmationForSubscription } from "../data/news-confirmations";
import {
  createProviderNewsRestriction,
  getActiveNewsRestriction,
  getLatestNewsRestriction,
  getNewsRestriction,
  patchNewsRestriction,
} from "../data/news-restrictions";
import {
  createNewsSubscription,
  getCurrentNewsSubscription,
  getNewsSubscription,
  markNewsSubscriptionConfirmed,
  markNewsSubscriptionUnsubscribed,
  patchNewsSubscription,
} from "../data/news-subscriptions";
import { getNewsSuppressionByEmail } from "../data/news-suppressions";
import { requireActiveNewsletterLegalBundle } from "../data/newsletter-legal-bundles";
import { createContactProfile, getProfile, getProfileIdByEmail } from "../data/profiles";
import { issueInitialEbookDownload, issueReplacementEbookDownload } from "./ebooks";
import {
  enqueueSendConfirmationEmail,
  enqueueSyncContactForReactivation,
  enqueueSyncContactForSubscription,
  enqueueSyncContactForUnsubscription,
} from "./loops";

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

// PROCESS PROVIDER WEBHOOK ----------------------------------------------------------------------------------------------------------------
export async function processNewsletterProviderWebhook(
  ctx: MutationCtx,
  { email, kind, messageId, occurredAt, webhookId }: LoopsWebhooks["Create"]
) {
  const existing = await getLoopsWebhookById(ctx, webhookId);
  if (existing) return;

  const id = await createLoopsWebhook(ctx, { email, kind, messageId, occurredAt, webhookId });
  const profileId = await getProfileIdByEmail(ctx, email);
  if (!profileId) return;

  if (kind === "email.unsubscribed") {
    const subscription = await getCurrentNewsSubscription(ctx, profileId);
    if (!subscription || occurredAt < subscription.requestedAt) return;
    await markNewsSubscriptionUnsubscribed(ctx, subscription._id, occurredAt);
  } else {
    const reason = kind === "email.hardBounced" ? "permanentBounce" : "spamComplaint";
    await applyProviderNewsRestriction(ctx, { occurredAt, profileId, reason });
  }

  await enqueueSyncContactForUnsubscription(ctx, { profileId, webhookId: id });
}

// APPLY PROVIDER RESTRICTION --------------------------------------------------------------------------------------------------------------
async function applyProviderNewsRestriction(ctx: MutationCtx, { occurredAt, profileId, reason }: ApplyProviderRestrictionOpts) {
  const current = await getActiveNewsRestriction(ctx, profileId);
  if (current === null) {
    const latest = await getLatestNewsRestriction(ctx, profileId);
    if (latest !== null && latest.resolvedAt !== null && occurredAt <= latest.resolvedAt) return latest._id;
    return await createProviderNewsRestriction(ctx, { lastOccurredAt: occurredAt, profileId, reason });
  }

  const nextReason = reason === "spamComplaint" ? reason : current.reason;
  const isNewer = occurredAt > current.lastOccurredAt;
  const upgradesReason = nextReason !== current.reason;
  if (!isNewer && !upgradesReason) return current._id;

  await patchNewsRestriction(ctx, current._id, {
    lastOccurredAt: Math.max(current.lastOccurredAt, occurredAt),
    reason: nextReason,
    restrictedBy: "provider",
    version: current.version + 1,
  });
  return current._id;
}
type ApplyProviderRestrictionOpts = { occurredAt: number; profileId: Id<"profiles">; reason: NewsRestrictions["Reason"] };

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
async function confirmReactivation(ctx: MutationCtx, { confirmation, now, profileId, subscription }: ConfirmReactivationOpts) {
  if (subscription.confirmedAt === null) return { confirmed: false, downloadToken: null };

  const { restrictionId, restrictionVersion } = confirmation;
  const restored = await resolveNewsRestrictionByConfirmation(ctx, { now, restrictionId, restrictionVersion });
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
    isEmailDeliveryAllowed = await resolveNewsRestrictionByConfirmation(ctx, {
      now,
      restrictionId: activeRestriction._id,
      restrictionVersion: activeRestriction.version,
    });

  await deleteNewsConfirmation(ctx, confirmation._id);

  if (isEmailDeliveryAllowed) await enqueueSyncContactForSubscription(ctx, { profileId, subscriptionId: subscription._id });
  return { confirmed: true, downloadToken: await issueInitialEbookDownload(ctx, { profileId, sendEmail: isEmailDeliveryAllowed }) };
}
type ConfirmSubscriptionOpts = ConfirmOpts & { confirmation: NewsConfirmations["SubscriptionDoc"] };

async function resolveNewsRestrictionByConfirmation(ctx: MutationCtx, opts: ResolveByConfirmationOpts) {
  const { now, restrictionId, restrictionVersion } = opts;
  const restriction = await getNewsRestriction(ctx, restrictionId);
  if (!restriction || restriction.resolvedAt !== null) return false;
  if (restrictionVersion !== undefined && restriction.version !== restrictionVersion) return false;

  await patchNewsRestriction(ctx, restrictionId, { resolvedAt: now, resolvedBy: "confirmation" });
  return true;
}
type ResolveByConfirmationOpts = WithNow<{ restrictionVersion?: number; restrictionId: Id<"newsRestrictions"> }>;

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
