import { isAnonymizedEmail } from "@ec/domain/helpers/newsletter";
import { Effect as E, Option as O } from "effect";

import { takeEbookIssuances } from "../data/ebook-issuances";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import { takeNewsSubscriptions } from "../data/news-subscriptions";
import { getNewsSuppressionByEmail, takeNewsSuppressions } from "../data/news-suppressions";
import { takeProfiles } from "../data/profiles";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const MAX_EXPORT_RECORDS = 5000;
const MAX_EXPORT_RELATIONS_PER_PROFILE = 20;

// CREATE DATA -----------------------------------------------------------------------------------------------------------------------------
export const createNewsletterDataExport = E.fn(function* (format: "csv" | "json") {
  const people = [];
  const profiles = yield* takeProfiles(MAX_EXPORT_RECORDS + 1);
  if (profiles.length > MAX_EXPORT_RECORDS) throw new Error("NEWSLETTER_EXPORT_LIMIT_EXCEEDED");
  for (const profile of profiles) {
    if (!profile.email || isAnonymizedEmail(profile.email)) continue;
    const [issuances, subscriptions] = yield* E.all([
      takeEbookIssuances(MAX_EXPORT_RELATIONS_PER_PROFILE + 1, profile._id),
      takeNewsSubscriptions(MAX_EXPORT_RELATIONS_PER_PROFILE + 1, profile._id),
    ]);
    requireBoundedRelations(subscriptions);
    requireBoundedRelations(issuances);
    const [restriction, suppression] = yield* E.all([getActiveNewsRestriction(profile._id), getNewsSuppressionByEmail(profile.email)]);
    if (subscriptions.length === 0 && issuances.length === 0 && O.isNone(restriction) && O.isNone(suppression)) continue;
    const hasCurrentConsent = subscriptions.some(({ confirmedAt, unsubscribedAt }) => confirmedAt !== null && unsubscribedAt === null);
    const consentPeriods = subscriptions.map(({ confirmedAt, privacyNoticeId, requestedAt, unsubscribedAt }) => ({
      confirmedAt,
      privacyNoticeId,
      requestedAt,
      unsubscribedAt,
    }));
    people.push({
      consentPeriods,
      ebookAccess: issuances.map(({ ebookId, kind }) => ({ ebookId, kind })),
      email: profile.email,
      firstName: profile.firstName ?? null,
      newsletterEligibility: {
        eligible: hasCurrentConsent && O.isNone(restriction) && O.isNone(suppression),
        restricted: O.isSome(restriction),
        suppressed: O.isSome(suppression),
      },
    });
  }
  const suppressionDocs = yield* takeNewsSuppressions(MAX_EXPORT_RECORDS + 1);
  if (suppressionDocs.length > MAX_EXPORT_RECORDS) throw new Error("NEWSLETTER_EXPORT_LIMIT_EXCEEDED");
  const suppressions = suppressionDocs.map(({ canonicalEmailHash }) => ({ canonicalEmailHash }));
  const payload = { people, suppressions, version: 1 };
  if (format === "json") return { content: JSON.stringify(payload, null, 2), contentType: "application/json" as const };
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
    contentType: "text/csv" as const,
  };
});

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
function escapeCsv(value: boolean | number | string | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function requireBoundedRelations(records: readonly unknown[], maxRelations = MAX_EXPORT_RELATIONS_PER_PROFILE) {
  if (records.length > maxRelations) throw new Error("NEWSLETTER_EXPORT_RELATION_LIMIT_EXCEEDED");
}
