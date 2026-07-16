import type { AdminQueryCtx } from "@ec/backend/convex/zod";
import type { MutationCtx } from "@ec/backend/server";

import { getActiveNewsRestriction } from "../data/news-restrictions";
import { getNewsSuppressionByEmail } from "../data/news-suppressions";
import {
  deleteEbookDownload,
  deleteLoopsTask,
  deleteLoopsWebhook,
  expireFormerProfileData,
  expirePendingProfileData,
  getFormerSubscriberActivity,
  getLoopsTaskByEbookDownload,
  getProfilePortabilityContext,
  getProfileSubscriptionContext,
  listNewsSuppressionsForPortability,
  listProfilesForPortability,
  paginateExpiredEbookDownloads,
  paginateExpiredLoopsTasks,
  paginateExpiredLoopsWebhooks,
  paginateRetentionProfiles,
} from "../data/retention";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_BATCH_SIZE = 100;
const PROFILE_RETENTION_BATCH_SIZE = 1;
const MAX_RELATIONS_PER_PROFILE = 20;
const MAX_EXPORT_RECORDS = 5000;
const ANONYMIZED_EMAIL_SUFFIX = "@anonymized.invalid";
export const PENDING_RETENTION_MS = 30 * DAY_MS;
export const TECHNICAL_RETENTION_MS = 90 * DAY_MS;
export const formerSubscriberCutoff = (now: number) => calendarYearsBefore(now, 3);

const phases = ["tasks", "webhooks", "downloads", "profiles"] as const;
export type RetentionPhase = (typeof phases)[number];
export type RetentionCounts = {
  anonymizedFormerProfiles: number;
  anonymizedPendingProfiles: number;
  deletedDownloads: number;
  deletedTechnicalLogs: number;
};
export type RetentionBatchResult = RetentionCounts & {
  cursor: string | null;
  done: boolean;
  phase: RetentionPhase;
};

const emptyCounts = (): RetentionCounts => ({
  anonymizedFormerProfiles: 0,
  anonymizedPendingProfiles: 0,
  deletedDownloads: 0,
  deletedTechnicalLogs: 0,
});

const anonymousEmailFor = (profileId: string) => `expired-${profileId}${ANONYMIZED_EMAIL_SUFFIX}`;
const escapeCsv = (value: boolean | number | string | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export async function enforceNewsletterRetentionBatch(
  ctx: MutationCtx,
  { cursor, now, phase }: { cursor: string | null; now: number; phase: RetentionPhase }
): Promise<RetentionBatchResult> {
  if (phase === "tasks") return await deleteExpiredTasks(ctx, { cursor, now });
  if (phase === "webhooks") return await deleteExpiredWebhooks(ctx, { cursor, now });
  if (phase === "downloads") return await deleteExpiredDownloads(ctx, { cursor, now });
  return await expireProfiles(ctx, { cursor, now });
}

async function deleteExpiredTasks(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<RetentionBatchResult> {
  const result = await paginateExpiredLoopsTasks(ctx, {
    before: now - TECHNICAL_RETENTION_MS,
    cursor,
    limit: RETENTION_BATCH_SIZE,
  });
  let deletedTechnicalLogs = 0;
  for (const task of result.page)
    if (task.finishedAt !== null && task.finishedAt <= now - TECHNICAL_RETENTION_MS) {
      await deleteLoopsTask(ctx, task._id);
      deletedTechnicalLogs += 1;
    }
  return nextBatch("tasks", "webhooks", result, { ...emptyCounts(), deletedTechnicalLogs });
}

async function deleteExpiredWebhooks(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<RetentionBatchResult> {
  const result = await paginateExpiredLoopsWebhooks(ctx, {
    before: now - TECHNICAL_RETENTION_MS,
    cursor,
    limit: RETENTION_BATCH_SIZE,
  });
  for (const webhook of result.page) await deleteLoopsWebhook(ctx, webhook._id);
  return nextBatch("webhooks", "downloads", result, { ...emptyCounts(), deletedTechnicalLogs: result.page.length });
}

async function deleteExpiredDownloads(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<RetentionBatchResult> {
  const result = await paginateExpiredEbookDownloads(ctx, {
    before: now - TECHNICAL_RETENTION_MS,
    cursor,
    limit: RETENTION_BATCH_SIZE,
  });
  let deletedDownloads = 0;
  for (const download of result.page) {
    const deliveryTask = await getLoopsTaskByEbookDownload(ctx, download._id);
    if (deliveryTask?.status === "pending") continue;
    await deleteEbookDownload(ctx, download._id);
    deletedDownloads += 1;
  }
  return nextBatch("downloads", "profiles", result, { ...emptyCounts(), deletedDownloads });
}

async function expireProfiles(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<RetentionBatchResult> {
  const result = await paginateRetentionProfiles(ctx, { cursor, limit: PROFILE_RETENTION_BATCH_SIZE });
  const counts = emptyCounts();
  for (const profile of result.page) {
    if (profile.role !== "contact" || profile.email.endsWith(ANONYMIZED_EMAIL_SUFFIX)) continue;
    const { hasSeparateRelationship, subscriptions } = await getProfileSubscriptionContext(ctx, profile._id, MAX_RELATIONS_PER_PROFILE + 1);
    requireBoundedRelations(subscriptions);
    if (subscriptions.length === 0) continue;

    const isExpiredPending = subscriptions.every(
      ({ confirmedAt, requestedAt }) => confirmedAt === null && requestedAt <= now - PENDING_RETENTION_MS
    );
    if (isExpiredPending) {
      await expirePendingProfile(
        ctx,
        profile._id,
        subscriptions.map(({ _id }) => _id),
        !hasSeparateRelationship
      );
      if (!hasSeparateRelationship) counts.anonymizedPendingProfiles += 1;
      continue;
    }

    if (hasSeparateRelationship) continue;
    const { contactRequests, ebookIssuances } = await getFormerSubscriberActivity(ctx, profile._id, MAX_RELATIONS_PER_PROFILE + 1);
    requireBoundedRelations(contactRequests);
    requireBoundedRelations(ebookIssuances);
    const latestContact = Math.max(
      ...subscriptions.map(({ requestedAt, unsubscribedAt }) => unsubscribedAt ?? requestedAt),
      ...contactRequests.map(({ _creationTime }) => _creationTime),
      ...ebookIssuances.map(({ _creationTime }) => _creationTime)
    );
    const isFormerSubscriber =
      subscriptions.some(({ confirmedAt }) => confirmedAt !== null) && subscriptions.every(({ unsubscribedAt }) => unsubscribedAt !== null);
    if (!isFormerSubscriber || latestContact > formerSubscriberCutoff(now)) continue;
    await expireFormerProfile(ctx, profile._id);
    counts.anonymizedFormerProfiles += 1;
  }
  return result.isDone
    ? { ...counts, cursor: null, done: true, phase: "profiles" }
    : { ...counts, cursor: result.continueCursor, done: false, phase: "profiles" };
}

async function expirePendingProfile(
  ctx: MutationCtx,
  profileId: Parameters<typeof expirePendingProfileData>[1]["profileId"],
  subscriptionIds: Parameters<typeof expirePendingProfileData>[1]["subscriptionIds"],
  shouldAnonymize: boolean
) {
  await expirePendingProfileData(ctx, {
    anonymousEmail: anonymousEmailFor(profileId),
    maxRelations: MAX_RELATIONS_PER_PROFILE,
    profileId,
    shouldAnonymize,
    subscriptionIds,
  });
}

async function expireFormerProfile(ctx: MutationCtx, profileId: Parameters<typeof expireFormerProfileData>[1]["profileId"]) {
  await expireFormerProfileData(ctx, {
    anonymousEmail: anonymousEmailFor(profileId),
    maxRelations: MAX_RELATIONS_PER_PROFILE,
    profileId,
  });
}

function calendarYearsBefore(timestamp: number, years: number) {
  const date = new Date(timestamp);
  const targetYear = date.getUTCFullYear() - years;
  const lastTargetMonthDay = new Date(Date.UTC(targetYear, date.getUTCMonth() + 1, 0)).getUTCDate();
  return Date.UTC(
    targetYear,
    date.getUTCMonth(),
    Math.min(date.getUTCDate(), lastTargetMonthDay),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
}

function requireBoundedRelations(records: readonly unknown[]) {
  if (records.length > MAX_RELATIONS_PER_PROFILE) throw new Error("RETENTION_RELATION_LIMIT_EXCEEDED");
}

function nextBatch(
  currentPhase: RetentionPhase,
  nextPhase: RetentionPhase,
  page: { continueCursor: string; isDone: boolean },
  counts: RetentionCounts
): RetentionBatchResult {
  return page.isDone
    ? { ...counts, cursor: null, done: false, phase: nextPhase }
    : { ...counts, cursor: page.continueCursor, done: false, phase: currentPhase };
}
type BatchOptions = { cursor: string | null; now: number };

export async function createNewsletterPortabilityExport(ctx: AdminQueryCtx, format: "csv" | "json") {
  const people = [];
  const profiles = await listProfilesForPortability(ctx, MAX_EXPORT_RECORDS + 1);
  if (profiles.length > MAX_EXPORT_RECORDS) throw new Error("PORTABILITY_EXPORT_LIMIT_EXCEEDED");
  for (const profile of profiles) {
    if (profile.role !== "contact" || profile.email.endsWith(ANONYMIZED_EMAIL_SUFFIX)) continue;
    const { issuances, subscriptions } = await getProfilePortabilityContext(ctx, profile._id, MAX_RELATIONS_PER_PROFILE + 1);
    requireBoundedRelations(subscriptions);
    requireBoundedRelations(issuances);
    const [restriction, suppression] = await Promise.all([
      getActiveNewsRestriction(ctx, profile._id),
      getNewsSuppressionByEmail(ctx, profile.email),
    ]);
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
  const suppressionDocs = await listNewsSuppressionsForPortability(ctx, MAX_EXPORT_RECORDS + 1);
  if (suppressionDocs.length > MAX_EXPORT_RECORDS) throw new Error("PORTABILITY_EXPORT_LIMIT_EXCEEDED");
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
