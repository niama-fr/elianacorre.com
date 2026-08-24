import { MINUTE } from "@convex-dev/rate-limiter";
import type { Id } from "@ec/backend/types";
import { verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import type { WithNow } from "@ec/domain/schemas/utils";
import { Config, Effect as E, Option as O } from "effect";

import { MutationCtx } from "../confect/_generated/services";
import { requirePrivacyNotice } from "../data/legal-texts";
import {
  deleteNewsConfirmation,
  getNewsConfirmation,
  listNewsConfirmationsBySubscriptionId,
  replaceNewsConfirmationForSubscription,
} from "../data/news-confirmations";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import {
  createNewsSubscription,
  getCurrentNewsSubscription,
  getNewsSubscription,
  markNewsSubscriptionConfirmed,
  patchNewsSubscription,
} from "../data/news-subscriptions";
import { getNewsSuppressionByEmail } from "../data/news-suppressions";
import { createContactProfile, getProfile, getProfileIdByEmail } from "../data/profiles";
import { makeRateLimiter } from "../infra/rate-limiter";
import { issueInitialEbookDownload, issueRecentReplacementEbookDownload, issueReplacementEbookDownload } from "./ebooks";
import { resolveEmailDeliveryRestrictionByConfirmation } from "./email-delivery-restrictions";
import { enqueueSendConfirmationEmail, enqueueSyncContactForReactivation, enqueueSyncContactForSubscription } from "./loops";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * MINUTE;

const rateLimiter = makeRateLimiter({
  confirmationRequestByEmail: { kind: "fixed window", period: RATE_LIMIT_WINDOW_MS, rate: 3 },
  confirmationRequestByIp: { kind: "fixed window", period: RATE_LIMIT_WINDOW_MS, rate: 3 },
});

// CONFIRM ---------------------------------------------------------------------------------------------------------------------------------
export const confirmNewsletter = E.fn(function* ({ now, token }: WithNow<{ token: string }>) {
  const confirmation = yield* resolveConfirmationFromToken({ now, token });
  if (O.isNone(confirmation)) return { confirmed: false, downloadToken: O.none() };
  const subscription = yield* getNewsSubscription(confirmation.value.subscriptionId);
  if (O.isNone(subscription) || subscription.value.unsubscribedAt !== null) return { confirmed: false, downloadToken: O.none() };
  const profile = yield* getProfile(subscription.value.profileId);
  if (O.isNone(profile)) return { confirmed: false, downloadToken: O.none() };
  const opts = { now, profileId: profile.value._id, subscription: subscription.value };
  if (confirmation.value.kind === "subscription") return yield* confirmSubscription({ confirmation: confirmation.value, ...opts });
  return yield* confirmReactivation({ confirmation: confirmation.value, ...opts });
});

// SUBSCRIBE -------------------------------------------------------------------------------------------------------------------------------
export const subscribeToNewsletter = E.fn("subscribeToNewsletter")(function* (opts: SubscribeToNewsletterOpts) {
  const { email, firstName, now, requestIp, website } = opts;
  if (website !== "" || O.isSome(yield* getNewsSuppressionByEmail(email))) return;
  yield* requirePrivacyNotice(opts.privacyNoticeId);
  const profileIdOpt = yield* getProfileIdByEmail(email);
  const subscription = O.isSome(profileIdOpt) ? yield* getCurrentNewsSubscription(profileIdOpt.value) : O.none();
  const restriction = O.isSome(profileIdOpt) ? yield* getActiveNewsRestriction(profileIdOpt.value) : O.none();
  if (O.isSome(restriction) && restriction.value.reason === "permanentBounce") return;

  yield* E.all([rateLimiter.limit("confirmationRequestByEmail", email), rateLimiter.limit("confirmationRequestByIp", requestIp)]);

  if (O.isSome(profileIdOpt) && O.isSome(subscription) && subscription.value.confirmedAt !== null) {
    if (O.isNone(restriction)) {
      yield* issueRecentReplacementEbookDownload({
        notBefore: now - RATE_LIMIT_WINDOW_MS,
        profileId: profileIdOpt.value,
        sendEmail: true,
      });
      return;
    }
    const confirmations = yield* listNewsConfirmationsBySubscriptionId(subscription.value._id);
    const currentReactivation = confirmations.find(
      (confirmation) =>
        confirmation.kind === "reactivation" &&
        confirmation.restrictionId === restriction.value._id &&
        confirmation.restrictionVersion === restriction.value.version &&
        confirmation._creationTime >= now - RATE_LIMIT_WINDOW_MS
    );
    if (currentReactivation) return;
    const newsConfirmationId = yield* replaceNewsConfirmationForSubscription({
      kind: "reactivation",
      restrictionId: restriction.value._id,
      restrictionVersion: restriction.value.version,
      subscriptionId: subscription.value._id,
    });

    yield* enqueueSendConfirmationEmail({ newsConfirmationId, profileId: profileIdOpt.value });
    return;
  }
  const profileId = O.isSome(profileIdOpt) ? profileIdOpt.value : yield* createContactProfile({ email, firstName });
  const subscriptionId = O.isSome(subscription)
    ? subscription.value._id
    : yield* createNewsSubscription({ privacyNoticeId: opts.privacyNoticeId, profileId, requestedAt: now });
  if (O.isSome(subscription)) yield* patchNewsSubscription(subscriptionId, { privacyNoticeId: opts.privacyNoticeId, requestedAt: now });
  const newsConfirmationId = yield* replaceNewsConfirmationForSubscription({
    kind: "subscription",
    restrictionId: O.isSome(restriction) ? restriction.value._id : null,
    restrictionVersion: O.isSome(restriction) ? restriction.value.version : null,
    subscriptionId,
  });

  yield* enqueueSendConfirmationEmail({ newsConfirmationId, profileId });
});
type SubscribeToNewsletterOpts = WithNow<{
  email: string;
  firstName?: string;
  privacyNoticeId: Id<"legalTexts">;
  requestIp: string;
  website: string;
}>;

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
const confirmReactivation = E.fn(function* ({ confirmation, now, profileId, subscription }: ConfirmReactivationOpts) {
  if (subscription.confirmedAt === null) return { confirmed: false, downloadToken: O.none() };
  const { restrictionId, restrictionVersion } = confirmation;
  const restored = yield* resolveEmailDeliveryRestrictionByConfirmation({ now, restrictionId, restrictionVersion });

  yield* deleteNewsConfirmation(confirmation._id);
  if (!restored) return { confirmed: false, downloadToken: O.none() };
  yield* enqueueSyncContactForReactivation({ confirmation, profileId });
  return { confirmed: true, downloadToken: yield* issueReplacementEbookDownload({ profileId, sendEmail: true }) };
});
type ConfirmReactivationOpts = ConfirmOpts & { confirmation: NewsConfirmations["ReactivationDoc"] };

const confirmSubscription = E.fn(function* ({ confirmation, now, profileId, subscription }: ConfirmSubscriptionOpts) {
  if (subscription.confirmedAt !== null) return { confirmed: false, downloadToken: O.none() };
  yield* markNewsSubscriptionConfirmed(subscription._id, { confirmedFrom: "email", now });
  const activeRestriction = yield* getActiveNewsRestriction(profileId);
  let isEmailDeliveryAllowed = O.isNone(activeRestriction);
  if (
    O.isSome(activeRestriction) &&
    activeRestriction.value._id === confirmation.restrictionId &&
    activeRestriction.value.version === confirmation.restrictionVersion
  )
    isEmailDeliveryAllowed = yield* resolveEmailDeliveryRestrictionByConfirmation({
      now,
      restrictionId: activeRestriction.value._id,
      restrictionVersion: activeRestriction.value.version,
    });

  yield* deleteNewsConfirmation(confirmation._id);
  if (isEmailDeliveryAllowed) yield* enqueueSyncContactForSubscription({ profileId, subscriptionId: subscription._id });
  return {
    confirmed: true,
    downloadToken: yield* issueInitialEbookDownload({ profileId, sendEmail: isEmailDeliveryAllowed }),
  };
});
type ConfirmSubscriptionOpts = ConfirmOpts & { confirmation: NewsConfirmations["SubscriptionDoc"] };

const resolveConfirmationFromToken = E.fn(function* ({ now, token }: WithNow<{ token: string }>) {
  const secret = yield* Config.string("CAPABILITY_SIGNING_SECRET").pipe(E.orDie);
  const capabilityId = yield* verifyCapabilityToken({ secret, token });
  if (O.isNone(capabilityId)) return O.none();
  const ctx = yield* MutationCtx;
  const id = ctx.db.normalizeId("newsConfirmations", capabilityId.value);
  if (!id) return O.none();
  const confirmation = yield* getNewsConfirmation(id);
  return O.filter(confirmation, ({ _creationTime }) => isNewsletterConfirmationCurrent(_creationTime, now));
});

export const isNewsletterConfirmationCurrent = (createdAt: number, now: number) => createdAt + CONFIRMATION_TTL_MS > now;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type ConfirmOpts = WithNow<{ profileId: Id<"profiles">; subscription: NewsSubscriptions["Doc"] }>;
