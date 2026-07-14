import type { AdminMutationCtx } from "@ec/backend/convex/zod";
import type { QueryCtx } from "@ec/backend/server";
import type { PrivacyAudits } from "@ec/domain/schemas/privacy-audits";

import { ebookIssuanceFromDoc, listEbookIssuances } from "../data/ebook-issuances";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import { getCurrentNewsSubscription, listNewsSubscriptions, markNewsSubscriptionUnsubscribed } from "../data/news-subscriptions";
import { deleteNewsSuppressionByEmail, ensureNewsSuppression, getNewsSuppressionByEmail } from "../data/news-suppressions";
import { createPrivacyAudit, listPrivacyAuditsByEmail } from "../data/privacy-audits";
import { deleteProfileWithRelations, getProfileByEmail, getProfileIdByEmail, patchProfile } from "../data/profiles";
import { enqueueDeleteContactForPrivacy, enqueueSyncContactForPrivacy } from "./loops";

// INSPECT ---------------------------------------------------------------------------------------------------------------------------------
export async function inspectPrivacySubject(ctx: QueryCtx, email: string) {
  const [profile, suppression, audits] = await Promise.all([
    getProfileByEmail(ctx, email),
    getNewsSuppressionByEmail(ctx, email),
    listPrivacyAuditsByEmail(ctx, email),
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
      privacyState: { audits, suppressed: !!suppression },
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
    privacyState: { audits, suppressed: !!suppression },
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
  const profile = await getProfileByEmail(ctx, email);
  if (profile && profile.role !== "contact") return await rejectRequest(ctx, email, "erasure");

  const { outcome, privacyAuditId } = await recordAudit(ctx, { email, kind: "erasure", outcome: "completed" });
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
  const profileId = await getProfileIdByEmail(ctx, email);
  await ensureNewsSuppression(ctx, email);
  if (profileId) {
    const subscription = await getCurrentNewsSubscription(ctx, profileId);
    if (subscription) await markNewsSubscriptionUnsubscribed(ctx, subscription._id, Date.now());
  }
  const { outcome, privacyAuditId } = await recordAudit(ctx, { email, kind: "objection", outcome: "completed" });
  if (profileId) await enqueueSyncContactForPrivacy(ctx, { privacyAuditId, profileId });
  return { outcome };
}

// PROCESS RECTIFICATION -------------------------------------------------------------------------------------------------------------------
export async function processPrivacyRectification(ctx: AdminMutationCtx, { email, firstName }: { email: string; firstName?: string }) {
  const profileId = await getProfileIdByEmail(ctx, email);
  if (profileId) await patchProfile(ctx, profileId, { firstName });
  const { outcome } = await recordAudit(ctx, { email, kind: "rectification", outcome: profileId ? "completed" : "rejected" });
  return { outcome };
}

// PROCESS SUPPRESSION REMOVAL -------------------------------------------------------------------------------------------------------------
export async function processPrivacySuppressionRemoval(ctx: AdminMutationCtx, email: string) {
  const deleted = await deleteNewsSuppressionByEmail(ctx, email);
  const { outcome } = await recordAudit(ctx, { email, kind: "suppressionRemoval", outcome: deleted ? "completed" : "rejected" });
  return { outcome };
}

// PROCESS UNSUBSCRIPTION ------------------------------------------------------------------------------------------------------------------
export async function processPrivacyUnsubscription(ctx: AdminMutationCtx, email: string) {
  const profileId = await getProfileIdByEmail(ctx, email);
  if (!profileId) return await rejectRequest(ctx, email, "unsubscription");

  const subscription = await getCurrentNewsSubscription(ctx, profileId);
  if (subscription) await markNewsSubscriptionUnsubscribed(ctx, subscription._id, Date.now());
  const { outcome, privacyAuditId } = await recordAudit(ctx, { email, kind: "unsubscription", outcome: "completed" });
  await enqueueSyncContactForPrivacy(ctx, { privacyAuditId, profileId });
  return { outcome };
}

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
async function processDataRetrieval(ctx: AdminMutationCtx, email: string, kind: "access" | "export") {
  const data = await inspectPrivacySubject(ctx, email);
  const isKnownSubject =
    !!data &&
    (!!data.profile ||
      data.privacyState.suppressed ||
      data.privacyState.audits.some((entry) => entry.kind === "erasure" && entry.outcome === "completed"));
  const { outcome } = await recordAudit(ctx, { email, kind, outcome: isKnownSubject ? "completed" : "rejected" });
  return { data: isKnownSubject ? data : null, outcome };
}

async function recordAudit(ctx: AdminMutationCtx, { email, kind, outcome }: Omit<PrivacyAudits["Create"], "performedBy">) {
  return { outcome, privacyAuditId: await createPrivacyAudit(ctx, { email, kind, outcome, performedBy: ctx.profile._id }) };
}

async function rejectRequest(ctx: AdminMutationCtx, email: string, kind: PrivacyAudits["Kind"]) {
  const { outcome } = await recordAudit(ctx, { email, kind, outcome: "rejected" });
  return { outcome };
}
