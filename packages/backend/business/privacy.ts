import { internal } from "@ec/backend/api";
import type { AdminMutationCtx } from "@ec/backend/convex/zod";
import type { QueryCtx } from "@ec/backend/server";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";

import { ebookIssuanceFromDoc, listEbookIssuances } from "../data/ebook-issuances";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import { getCurrentNewsSubscription, listNewsSubscriptions, markNewsSubscriptionUnsubscribed } from "../data/news-subscriptions";
import { deleteNewsSuppressionByEmail, ensureNewsSuppression, getNewsSuppressionByEmail } from "../data/news-suppressions";
import { createPrivacyAuditRequest, createPrivacyAuditVerification, listPrivacyAuditsByEmail } from "../data/privacy-audits";
import { consumePrivacyGrant, listActivePrivacyGrants, replacePrivacyGrant, revokePrivacyGrant } from "../data/privacy-grants";
import { deleteProfileWithRelations, getProfileByEmail, getProfileIdByEmail, patchProfile } from "../data/profiles";
import { enqueueDeleteContactForPrivacy, enqueueSyncContactForPrivacy } from "./loops";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const PRIVACY_GRANT_TTL_MS = 30 * 60 * 1000;

// INSPECT ---------------------------------------------------------------------------------------------------------------------------------
export async function inspectPrivacySubject(ctx: QueryCtx, email: string) {
  const now = Date.now();
  const [profile, suppression, audits, grants] = await Promise.all([
    getProfileByEmail(ctx, email),
    getNewsSuppressionByEmail(ctx, email),
    listPrivacyAuditsByEmail(ctx, email),
    listActivePrivacyGrants(ctx, { email, now }),
  ]);
  if (!profile && !suppression && audits.length === 0) return null;

  if (!profile)
    return {
      deliveryEligibility: {
        eligible: false,
        restriction: null,
        status: suppression ? ("suppressed" as const) : ("notConsenting" as const),
      },
      newsletterConsent: { periods: [] },
      privacyState: {
        audits,
        grants: grants.map(({ expiresAt, requestKind }) => ({ expiresAt, requestKind })),
        suppressed: !!suppression,
      },
      profile: null,
      welcomeEbookAccess: { issuances: [] },
    };

  const [consentPeriods, restriction, ebookIssuances] = await Promise.all([
    listNewsSubscriptions(ctx, profile._id),
    getActiveNewsRestriction(ctx, profile._id),
    listEbookIssuances(ctx, profile._id),
  ]);

  const issuances = await Promise.all(ebookIssuances.map(async (doc) => await ebookIssuanceFromDoc(ctx, doc)));

  const currentConsent = consentPeriods.find(({ confirmedAt, unsubscribedAt }) => confirmedAt !== null && unsubscribedAt === null);

  let status: "eligible" | "notConsenting" | "restricted" | "suppressed";
  if (suppression) status = "suppressed";
  else if (restriction) status = "restricted";
  else if (currentConsent === undefined) status = "notConsenting";
  else status = "eligible";

  return {
    deliveryEligibility: { eligible: status === "eligible", restriction, status },
    newsletterConsent: { periods: consentPeriods },
    privacyState: {
      audits,
      grants: grants.map(({ expiresAt, requestKind }) => ({ expiresAt, requestKind })),
      suppressed: !!suppression,
    },
    profile,
    welcomeEbookAccess: { issuances },
  };
}

// PROCESS ACCESS --------------------------------------------------------------------------------------------------------------------------
export async function processPrivacyAccess(ctx: AdminMutationCtx, email: string) {
  return await processDataRetrieval(ctx, email, "access");
}

// PROCESS ERASURE -------------------------------------------------------------------------------------------------------------------------
export async function processPrivacyErasure(ctx: AdminMutationCtx, email: string) {
  const verificationAuditId = await consumePrivacyGrant(ctx, { email, now: Date.now(), requestKind: "erasure" });
  const profile = await getProfileByEmail(ctx, email);
  if (profile && profile.role !== "contact") return await rejectRequest(ctx, { email, kind: "erasure", verificationAuditId });

  const { outcome, privacyAuditId } = await recordAuditRequest(ctx, {
    email,
    kind: "erasure",
    outcome: "completed",
    verificationAuditId,
  });
  await enqueueDeleteContactForPrivacy(ctx, { email, privacyAuditId });
  if (profile) await deleteProfileWithRelations(ctx, profile._id);
  return { outcome };
}

// PROCESS EXPORT --------------------------------------------------------------------------------------------------------------------------
export async function processPrivacyExport(ctx: AdminMutationCtx, email: string) {
  return await processDataRetrieval(ctx, email, "export");
}

// PROCESS OBJECTION -----------------------------------------------------------------------------------------------------------------------
export async function processPrivacyObjection(ctx: AdminMutationCtx, email: string) {
  const verificationAuditId = await consumePrivacyGrant(ctx, { email, now: Date.now(), requestKind: "objection" });
  const profileId = await getProfileIdByEmail(ctx, email);
  await ensureNewsSuppression(ctx, email);
  if (profileId) {
    const subscription = await getCurrentNewsSubscription(ctx, profileId);
    if (subscription) await markNewsSubscriptionUnsubscribed(ctx, subscription._id, Date.now());
  }
  const { outcome, privacyAuditId } = await recordAuditRequest(ctx, {
    email,
    kind: "objection",
    outcome: "completed",
    verificationAuditId,
  });
  if (profileId) await enqueueSyncContactForPrivacy(ctx, { privacyAuditId, profileId });
  return { outcome };
}

// PROCESS RECTIFICATION -------------------------------------------------------------------------------------------------------------------
export async function processPrivacyRectification(ctx: AdminMutationCtx, { email, firstName }: { email: string; firstName?: string }) {
  const verificationAuditId = await consumePrivacyGrant(ctx, { email, now: Date.now(), requestKind: "rectification" });
  const profileId = await getProfileIdByEmail(ctx, email);
  if (profileId) await patchProfile(ctx, profileId, { firstName });
  const { outcome } = await recordAuditRequest(ctx, {
    email,
    kind: "rectification",
    outcome: profileId ? "completed" : "rejected",
    verificationAuditId,
  });
  return { outcome };
}

// PROCESS SUPPRESSION REMOVAL -------------------------------------------------------------------------------------------------------------
export async function processPrivacySuppressionRemoval(ctx: AdminMutationCtx, email: string) {
  const verificationAuditId = await consumePrivacyGrant(ctx, { email, now: Date.now(), requestKind: "suppressionRemoval" });
  const deleted = await deleteNewsSuppressionByEmail(ctx, email);
  const { outcome } = await recordAuditRequest(ctx, {
    email,
    kind: "suppressionRemoval",
    outcome: deleted ? "completed" : "rejected",
    verificationAuditId,
  });
  return { outcome };
}

// PROCESS UNSUBSCRIPTION ------------------------------------------------------------------------------------------------------------------
export async function processPrivacyUnsubscription(ctx: AdminMutationCtx, email: string) {
  const verificationAuditId = await consumePrivacyGrant(ctx, { email, now: Date.now(), requestKind: "unsubscription" });
  const profileId = await getProfileIdByEmail(ctx, email);
  if (!profileId) return await rejectRequest(ctx, { email, kind: "unsubscription", verificationAuditId });

  const subscription = await getCurrentNewsSubscription(ctx, profileId);
  if (subscription) await markNewsSubscriptionUnsubscribed(ctx, subscription._id, Date.now());
  const { outcome, privacyAuditId } = await recordAuditRequest(ctx, {
    email,
    kind: "unsubscription",
    outcome: "completed",
    verificationAuditId,
  });
  await enqueueSyncContactForPrivacy(ctx, { privacyAuditId, profileId });
  return { outcome };
}

// PROCESS VERIFICATION --------------------------------------------------------------------------------------------------------------------
export async function processPrivacyVerification(ctx: AdminMutationCtx, { outcome, ...create }: ProcessVerificationOpts) {
  const verificationAuditId = await createPrivacyAuditVerification(ctx, { ...create, outcome, performedBy: ctx.profile._id });
  await revokePrivacyGrant(ctx, { email: create.email, requestKind: create.requestKind });
  if (outcome === "completed") {
    const expiresAt = Date.now() + PRIVACY_GRANT_TTL_MS;
    const privacyGrantId = await replacePrivacyGrant(ctx, {
      email: create.email,
      expiresAt,
      requestKind: create.requestKind,
      verificationAuditId,
    });
    await ctx.scheduler.runAt(expiresAt, internal.privacy.expireGrant, { privacyGrantId });
  }

  return { outcome };
}
type ProcessVerificationOpts = Omit<PrivacyAudits["VerificationCreate"], "kind" | "performedBy">;

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
async function processDataRetrieval(ctx: AdminMutationCtx, email: string, kind: "access" | "export") {
  const verificationAuditId = await consumePrivacyGrant(ctx, { email, now: Date.now(), requestKind: kind });
  const data = await inspectPrivacySubject(ctx, email);
  const isKnownSubject =
    !!data &&
    (!!data.profile ||
      data.privacyState.suppressed ||
      data.privacyState.audits.some((entry) => entry.kind === "erasure" && entry.outcome === "completed"));
  const { outcome } = await recordAuditRequest(ctx, {
    email,
    kind,
    outcome: isKnownSubject ? "completed" : "rejected",
    verificationAuditId,
  });
  return { data: isKnownSubject ? data : null, outcome };
}

async function recordAuditRequest(ctx: AdminMutationCtx, { outcome, ...create }: Omit<PrivacyAudits["RequestCreate"], "performedBy">) {
  return { outcome, privacyAuditId: await createPrivacyAuditRequest(ctx, { ...create, outcome, performedBy: ctx.profile._id }) };
}

async function rejectRequest(ctx: AdminMutationCtx, create: Omit<PrivacyAudits["RequestCreate"], "outcome" | "performedBy">) {
  const { outcome } = await recordAuditRequest(ctx, { ...create, outcome: "rejected" });
  return { outcome };
}
