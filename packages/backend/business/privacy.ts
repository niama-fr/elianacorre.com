import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";
import { DateTime, Effect as E, Option as O } from "effect";

import refs from "../confect/_generated/refs";
import { Scheduler } from "../confect/_generated/services";
import { ebookIssuanceDtoFrom, listEbookIssuancesNewestFirst } from "../data/ebook-issuances";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import { getCurrentNewsSubscription, listNewsSubscriptionsNewestFirst, markNewsSubscriptionUnsubscribed } from "../data/news-subscriptions";
import { deleteNewsSuppressionByEmail, ensureNewsSuppression, getNewsSuppressionByEmail } from "../data/news-suppressions";
import { createPrivacyAuditRequest, createPrivacyAuditVerification, listPrivacyAuditsByEmail } from "../data/privacy-audits";
import { consumePrivacyGrant, listActivePrivacyGrants, replacePrivacyGrant, revokePrivacyGrant } from "../data/privacy-grants";
import { deleteProfileWithRelations, getProfileByEmail, getProfileIdByEmail, patchProfile } from "../data/profiles";
import { CurrentAdmin } from "../runtime/current-profile";
import { enqueueDeleteContactForPrivacy, enqueueSyncContactForPrivacy } from "./loops";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const PRIVACY_GRANT_TTL_MS = 30 * 60 * 1000;

// INSPECT ---------------------------------------------------------------------------------------------------------------------------------
export const inspectPrivacySubject = E.fn(function* (email: string) {
  const now = Date.now();
  const [profile, suppression, audits, grants] = yield* E.all([
    getProfileByEmail(email),
    getNewsSuppressionByEmail(email),
    listPrivacyAuditsByEmail(email),
    listActivePrivacyGrants({ email, now }),
  ]);

  if (O.isNone(profile) && O.isNone(suppression) && audits.length === 0) return null;
  if (O.isNone(profile))
    return {
      deliveryEligibility: {
        eligible: false,
        restriction: null,
        status: O.isSome(suppression) ? ("suppressed" as const) : ("notConsenting" as const),
      },
      newsletterConsent: { periods: [] },
      privacyState: {
        audits,
        grants: grants.map(({ expiresAt, requestKind }) => ({ expiresAt, requestKind })),
        suppressed: O.isSome(suppression),
      },
      profile: null,
      welcomeEbookAccess: { issuances: [] },
    };
  const [consentPeriods, restriction, ebookIssuances] = yield* E.all([
    listNewsSubscriptionsNewestFirst(profile.value._id),
    getActiveNewsRestriction(profile.value._id),
    listEbookIssuancesNewestFirst(profile.value._id),
  ]);

  const issuances = yield* E.all(ebookIssuances.map((doc) => ebookIssuanceDtoFrom(doc)));

  const currentConsent = consentPeriods.find(({ confirmedAt, unsubscribedAt }) => confirmedAt !== null && unsubscribedAt === null);
  let status: "eligible" | "notConsenting" | "restricted" | "suppressed";
  if (O.isSome(suppression)) status = "suppressed";
  else if (O.isSome(restriction)) status = "restricted";
  else if (currentConsent === undefined) status = "notConsenting";
  else status = "eligible";
  return {
    deliveryEligibility: { eligible: status === "eligible", restriction: O.getOrNull(restriction), status },
    newsletterConsent: { periods: consentPeriods },
    privacyState: {
      audits,
      grants: grants.map(({ expiresAt, requestKind }) => ({ expiresAt, requestKind })),
      suppressed: O.isSome(suppression),
    },
    profile: O.getOrNull(profile),
    welcomeEbookAccess: { issuances },
  };
});

// PROCESS ACCESS --------------------------------------------------------------------------------------------------------------------------
export const processPrivacyAccess = E.fn(function* (email: string) {
  return yield* processDataRetrieval(email, "access");
});

// PROCESS ERASURE -------------------------------------------------------------------------------------------------------------------------
export const processPrivacyErasure = E.fn(function* (email: string) {
  const verificationAuditId = yield* consumePrivacyGrant({ email, now: Date.now(), requestKind: "erasure" });
  const profile = yield* getProfileByEmail(email);
  if (O.isSome(profile) && profile.value.role !== "contact") return yield* rejectRequest({ email, kind: "erasure", verificationAuditId });
  const { outcome, privacyAuditId } = yield* completeRequest({ email, kind: "erasure", verificationAuditId });
  yield* enqueueDeleteContactForPrivacy({ email, privacyAuditId });
  if (O.isSome(profile)) yield* deleteProfileWithRelations(profile.value._id);
  return { outcome };
});

// PROCESS EXPORT --------------------------------------------------------------------------------------------------------------------------
export const processPrivacyExport = E.fn(function* (email: string) {
  return yield* processDataRetrieval(email, "export");
});

// PROCESS OBJECTION -----------------------------------------------------------------------------------------------------------------------
export const processPrivacyObjection = E.fn(function* (email: string) {
  const verificationAuditId = yield* consumePrivacyGrant({ email, now: Date.now(), requestKind: "objection" });
  const profileId = yield* getProfileIdByEmail(email);
  yield* ensureNewsSuppression(email);
  if (O.isSome(profileId)) {
    const subscription = yield* getCurrentNewsSubscription(profileId.value);
    if (O.isSome(subscription)) yield* markNewsSubscriptionUnsubscribed(subscription.value._id, Date.now());
  }
  const { outcome, privacyAuditId } = yield* completeRequest({ email, kind: "objection", verificationAuditId });
  if (O.isSome(profileId)) yield* enqueueSyncContactForPrivacy({ privacyAuditId, profileId: profileId.value });
  return { outcome };
});

// PROCESS RECTIFICATION -------------------------------------------------------------------------------------------------------------------
export const processPrivacyRectification = E.fn(function* ({ email, firstName }: { email: string; firstName?: string }) {
  const verificationAuditId = yield* consumePrivacyGrant({ email, now: Date.now(), requestKind: "rectification" });
  const profileId = yield* getProfileIdByEmail(email);
  if (O.isSome(profileId)) yield* patchProfile(profileId.value, { firstName });
  const { outcome } = yield* recordRequest({ email, isCompleted: O.isSome(profileId), kind: "rectification", verificationAuditId });
  return { outcome };
});

// PROCESS SUPPRESSION REMOVAL -------------------------------------------------------------------------------------------------------------
export const processPrivacySuppressionRemoval = E.fn(function* (email: string) {
  const verificationAuditId = yield* consumePrivacyGrant({ email, now: Date.now(), requestKind: "suppressionRemoval" });
  const deleted = yield* deleteNewsSuppressionByEmail(email);
  const { outcome } = yield* recordRequest({ email, isCompleted: deleted, kind: "suppressionRemoval", verificationAuditId });
  return { outcome };
});

// PROCESS UNSUBSCRIPTION ------------------------------------------------------------------------------------------------------------------
export const processPrivacyUnsubscription = E.fn(function* (email: string) {
  const verificationAuditId = yield* consumePrivacyGrant({ email, now: Date.now(), requestKind: "unsubscription" });
  const profileId = yield* getProfileIdByEmail(email);
  if (O.isNone(profileId)) return yield* rejectRequest({ email, kind: "unsubscription", verificationAuditId });
  const subscription = yield* getCurrentNewsSubscription(profileId.value);
  if (O.isSome(subscription)) yield* markNewsSubscriptionUnsubscribed(subscription.value._id, Date.now());
  const { outcome, privacyAuditId } = yield* completeRequest({ email, kind: "unsubscription", verificationAuditId });
  yield* enqueueSyncContactForPrivacy({ privacyAuditId, profileId: profileId.value });
  return { outcome };
});

// PROCESS VERIFICATION --------------------------------------------------------------------------------------------------------------------
export const processPrivacyVerification = E.fn(function* ({ outcome, ...create }: ProcessVerificationOpts) {
  const profile = yield* CurrentAdmin;
  const scheduler = yield* Scheduler;
  const verificationAuditId = yield* createPrivacyAuditVerification({ ...create, outcome, performedBy: profile._id });
  if (outcome === "completed") {
    const expiresAt = Date.now() + PRIVACY_GRANT_TTL_MS;
    const privacyGrantId = yield* replacePrivacyGrant({
      email: create.email,
      expiresAt,
      requestKind: create.requestKind,
      verificationAuditId,
    });

    yield* scheduler.runAt(DateTime.makeUnsafe(expiresAt), refs.internal.privacy.expireGrant, { privacyGrantId });
  } else yield* revokePrivacyGrant({ email: create.email, requestKind: create.requestKind });
  return { outcome };
});
type ProcessVerificationOpts = Omit<PrivacyAudits["VerificationCreate"], "kind" | "performedBy">;

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
const processDataRetrieval = E.fn(function* (email: string, kind: "access" | "export") {
  const verificationAuditId = yield* consumePrivacyGrant({ email, now: Date.now(), requestKind: kind });
  const data = yield* inspectPrivacySubject(email);
  const isKnownSubject =
    !!data &&
    (!!data.profile ||
      data.privacyState.suppressed ||
      data.privacyState.audits.some((entry) => entry.kind === "erasure" && entry.outcome === "completed"));
  const { outcome } = yield* recordRequest({ email, isCompleted: isKnownSubject, kind, verificationAuditId });
  return { data: isKnownSubject ? data : null, outcome };
});

const recordRequest = E.fn(function* ({ isCompleted, ...create }: RecordRequestOpts) {
  const profile = yield* CurrentAdmin;
  const outcome: PrivacyAudits["Outcome"] = isCompleted ? "completed" : "rejected";
  return {
    outcome,
    privacyAuditId: yield* createPrivacyAuditRequest({ ...create, outcome, performedBy: profile._id }),
  };
});
type RecordRequestOpts = Omit<PrivacyAudits["RequestCreate"], "outcome" | "performedBy"> & { isCompleted: boolean };

const completeRequest = E.fn(function* (create: Omit<PrivacyAudits["RequestCreate"], "outcome" | "performedBy">) {
  return yield* recordRequest({ ...create, isCompleted: true });
});

const rejectRequest = E.fn(function* (create: Omit<PrivacyAudits["RequestCreate"], "outcome" | "performedBy">) {
  const { outcome } = yield* recordRequest({ ...create, isCompleted: false });
  return { outcome };
});
