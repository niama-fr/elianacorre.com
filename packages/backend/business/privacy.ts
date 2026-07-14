import type { QueryCtx } from "@ec/backend/server";

import { ebookIssuanceFromDoc, listEbookIssuances } from "../data/ebook-issuances";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import { listNewsSubscriptions } from "../data/news-subscriptions";
import { getNewsSuppressionByEmail } from "../data/news-suppressions";
import { listPrivacyAuditsByEmail } from "../data/privacy-audits";
import { getProfileByEmail } from "../data/profiles";

// INSPECT ---------------------------------------------------------------------------------------------------------------------------------
export async function inspectPerson(ctx: QueryCtx, email: string) {
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
