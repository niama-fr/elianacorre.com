import type { QueryCtx } from "@ec/backend/server";
import { isAnonymizedEmail } from "@ec/domain/helpers/newsletter";

import { takeEbookIssuances } from "../data/ebook-issuances";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import { takeNewsSubscriptions } from "../data/news-subscriptions";
import { getNewsSuppressionByEmail, takeNewsSuppressions } from "../data/news-suppressions";
import { takeProfiles } from "../data/profiles";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const MAX_EXPORT_RECORDS = 5000;
const MAX_EXPORT_RELATIONS_PER_PROFILE = 20;

// CREATE DATA -----------------------------------------------------------------------------------------------------------------------------
export async function createNewsletterDataExport(ctx: QueryCtx, format: "csv" | "json") {
  const people = [];
  const profiles = await takeProfiles(ctx, MAX_EXPORT_RECORDS + 1);
  if (profiles.length > MAX_EXPORT_RECORDS) throw new Error("NEWSLETTER_EXPORT_LIMIT_EXCEEDED");
  for (const profile of profiles) {
    if (isAnonymizedEmail(profile.email)) continue;
    const [issuances, subscriptions] = await Promise.all([
      takeEbookIssuances(ctx, MAX_EXPORT_RELATIONS_PER_PROFILE + 1, profile._id),
      takeNewsSubscriptions(ctx, MAX_EXPORT_RELATIONS_PER_PROFILE + 1, profile._id),
    ]);

    requireBoundedRelations(subscriptions);
    requireBoundedRelations(issuances);
    const [restriction, suppression] = await Promise.all([
      getActiveNewsRestriction(ctx, profile._id),
      getNewsSuppressionByEmail(ctx, profile.email),
    ]);
    if (subscriptions.length === 0 && issuances.length === 0 && !restriction && !suppression) continue;
    const hasCurrentConsent = subscriptions.some(({ confirmedAt, unsubscribedAt }) => confirmedAt !== null && unsubscribedAt === null);
    people.push({
      consentPeriods: subscriptions.map(({ confirmedAt, legalBundleId, requestedAt, unsubscribedAt }) => ({
        confirmedAt,
        legalBundleId,
        requestedAt,
        unsubscribedAt,
      })),
      ebookAccess: issuances.map(({ ebookId, kind }) => ({ ebookId, kind })),
      email: profile.email,
      firstName: profile.firstName ?? null,
      newsletterEligibility: {
        eligible: hasCurrentConsent && !restriction && !suppression,
        restricted: !!restriction,
        suppressed: !!suppression,
      },
    });
  }
  const suppressionDocs = await takeNewsSuppressions(ctx, MAX_EXPORT_RECORDS + 1);
  if (suppressionDocs.length > MAX_EXPORT_RECORDS) throw new Error("NEWSLETTER_EXPORT_LIMIT_EXCEEDED");
  const suppressions = suppressionDocs.map(({ canonicalEmailHash }) => ({ canonicalEmailHash }));
  const payload = { exportedAt: Date.now(), people, suppressions, version: 1 };
  if (format === "json") return { content: JSON.stringify(payload, null, 2), contentType: "application/json" };

  const personRows = people.map((person) =>
    [
      "person",
      person.email,
      person.firstName,
      JSON.stringify(person.newsletterEligibility),
      JSON.stringify(person.consentPeriods),
      JSON.stringify(person.ebookAccess),
      "",
    ]
      .map(escapeCsv)
      .join(",")
  );
  const suppressionRows = suppressions.map(({ canonicalEmailHash }) =>
    ["suppression", "", "", "", "", "", canonicalEmailHash].map(escapeCsv).join(",")
  );
  return {
    content: [
      "recordType,email,firstName,newsletterEligibility,consentPeriods,ebookAccess,suppressionHash",
      ...personRows,
      ...suppressionRows,
    ].join("\n"),
    contentType: "text/csv",
  };
}

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
function escapeCsv(value: boolean | number | string | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function requireBoundedRelations(records: readonly unknown[], maxRelations = MAX_EXPORT_RELATIONS_PER_PROFILE) {
  if (records.length > maxRelations) throw new Error("NEWSLETTER_EXPORT_RELATION_LIMIT_EXCEEDED");
}
