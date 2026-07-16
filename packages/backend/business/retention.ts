import type { AdminQueryCtx } from "@ec/backend/convex/zod";
import type { MutationCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";

import { getActiveNewsRestriction } from "../data/news-restrictions";
import { getNewsSuppressionByEmail } from "../data/news-suppressions";

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
  const result = await ctx.db
    .query("loopsTasks")
    .withIndex("by_finished_at", (query) => query.lte("finishedAt", now - TECHNICAL_RETENTION_MS))
    .paginate({ cursor, numItems: RETENTION_BATCH_SIZE });
  let deletedTechnicalLogs = 0;
  for (const task of result.page)
    if (task.finishedAt !== null && task.finishedAt <= now - TECHNICAL_RETENTION_MS) {
      await ctx.db.delete(task._id);
      deletedTechnicalLogs += 1;
    }
  return nextBatch("tasks", "webhooks", result, { ...emptyCounts(), deletedTechnicalLogs });
}

async function deleteExpiredWebhooks(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<RetentionBatchResult> {
  const result = await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_occurred_at", (query) => query.lte("occurredAt", now - TECHNICAL_RETENTION_MS))
    .paginate({ cursor, numItems: RETENTION_BATCH_SIZE });
  for (const webhook of result.page) await ctx.db.delete(webhook._id);
  return nextBatch("webhooks", "downloads", result, { ...emptyCounts(), deletedTechnicalLogs: result.page.length });
}

async function deleteExpiredDownloads(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<RetentionBatchResult> {
  const result = await ctx.db
    .query("ebookDownloads")
    .withIndex("by_creation_time", (query) => query.lte("_creationTime", now - TECHNICAL_RETENTION_MS))
    .paginate({ cursor, numItems: RETENTION_BATCH_SIZE });
  let deletedDownloads = 0;
  for (const download of result.page) {
    const deliveryTask = await ctx.db
      .query("loopsTasks")
      .withIndex("by_ebook_download_id", (query) => query.eq("ebookDownloadId", download._id))
      .unique();
    if (deliveryTask?.status === "pending") continue;
    await ctx.db.delete(download._id);
    deletedDownloads += 1;
  }
  return nextBatch("downloads", "profiles", result, { ...emptyCounts(), deletedDownloads });
}

async function expireProfiles(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<RetentionBatchResult> {
  const result = await ctx.db.query("profiles").paginate({ cursor, numItems: PROFILE_RETENTION_BATCH_SIZE });
  const counts = emptyCounts();
  for (const profile of result.page) {
    if (profile.role !== "contact" || profile.email.endsWith(ANONYMIZED_EMAIL_SUFFIX)) continue;
    const subscriptions = await ctx.db
      .query("newsSubscriptions")
      .withIndex("by_profile_id_and_confirmed_at", (query) => query.eq("profileId", profile._id))
      .take(MAX_RELATIONS_PER_PROFILE + 1);
    requireBoundedRelations(subscriptions);
    if (subscriptions.length === 0) continue;
    const hasActiveRelationship = await hasSeparateRelationship(ctx, profile._id);

    const isExpiredPending = subscriptions.every(
      ({ confirmedAt, requestedAt }) => confirmedAt === null && requestedAt <= now - PENDING_RETENTION_MS
    );
    if (isExpiredPending) {
      await expirePendingProfile(
        ctx,
        profile._id,
        subscriptions.map(({ _id }) => _id),
        !hasActiveRelationship
      );
      if (!hasActiveRelationship) counts.anonymizedPendingProfiles += 1;
      continue;
    }

    if (hasActiveRelationship) continue;

    const [contactRequests, ebookIssuances] = await Promise.all([
      ctx.db
        .query("contactRequests")
        .withIndex("by_profile_id", (query) => query.eq("profileId", profile._id))
        .take(MAX_RELATIONS_PER_PROFILE + 1),
      ctx.db
        .query("ebookIssuances")
        .withIndex("by_profile_id", (query) => query.eq("profileId", profile._id))
        .take(MAX_RELATIONS_PER_PROFILE + 1),
    ]);
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
  profileId: Id<"profiles">,
  subscriptionIds: Id<"newsSubscriptions">[],
  shouldAnonymize: boolean
) {
  const tasks = await ctx.db
    .query("loopsTasks")
    .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
    .take(MAX_RELATIONS_PER_PROFILE + 1);
  requireBoundedRelations(tasks);
  for (const subscriptionId of subscriptionIds) {
    const confirmations = await ctx.db
      .query("newsConfirmations")
      .withIndex("by_subscription_id", (query) => query.eq("subscriptionId", subscriptionId))
      .take(MAX_RELATIONS_PER_PROFILE + 1);
    requireBoundedRelations(confirmations);
    for (const confirmation of confirmations) {
      for (const task of tasks)
        if (task.kind === "sendConfirmationEmail" && task.newsConfirmationId === confirmation._id) await ctx.db.delete(task._id);
      await ctx.db.delete(confirmation._id);
    }
  }
  if (shouldAnonymize) await anonymizeProfile(ctx, profileId);
}

async function expireFormerProfile(ctx: MutationCtx, profileId: Id<"profiles">) {
  const tasks = await ctx.db
    .query("loopsTasks")
    .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
    .take(MAX_RELATIONS_PER_PROFILE + 1);
  requireBoundedRelations(tasks);
  const issuances = await ctx.db
    .query("ebookIssuances")
    .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
    .take(MAX_RELATIONS_PER_PROFILE + 1);
  requireBoundedRelations(issuances);
  for (const issuance of issuances) {
    const downloads = await ctx.db
      .query("ebookDownloads")
      .withIndex("by_ebook_issuance_id", (query) => query.eq("ebookIssuanceId", issuance._id))
      .take(MAX_RELATIONS_PER_PROFILE + 1);
    requireBoundedRelations(downloads);
    for (const download of downloads) {
      for (const task of tasks) if (task.kind === "sendEbookEmail" && task.ebookDownloadId === download._id) await ctx.db.delete(task._id);
      await ctx.db.delete(download._id);
    }
    await ctx.db.delete(issuance._id);
  }
  await anonymizeProfile(ctx, profileId);
}

async function anonymizeProfile(ctx: MutationCtx, profileId: Id<"profiles">) {
  const profile = await ctx.db.get(profileId);
  if (!profile) return;
  const anonymousEmail = `expired-${profileId}${ANONYMIZED_EMAIL_SUFFIX}`;
  const webhooks = await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_email", (query) => query.eq("email", profile.email))
    .take(MAX_RELATIONS_PER_PROFILE + 1);
  requireBoundedRelations(webhooks);
  for (const webhook of webhooks) await ctx.db.patch(webhook._id, { email: anonymousEmail });
  await ctx.db.patch(profileId, { email: anonymousEmail, firstName: undefined, lastName: undefined });
}

async function hasSeparateRelationship(ctx: MutationCtx, profileId: Id<"profiles">) {
  const identity = await ctx.db
    .query("identities")
    .withIndex("by_profile_id_and_adapter", (query) => query.eq("profileId", profileId))
    .first();
  return !!identity;
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
  const profiles = await ctx.db.query("profiles").take(MAX_EXPORT_RECORDS + 1);
  if (profiles.length > MAX_EXPORT_RECORDS) throw new Error("PORTABILITY_EXPORT_LIMIT_EXCEEDED");
  for (const profile of profiles) {
    if (profile.role !== "contact" || profile.email.endsWith(ANONYMIZED_EMAIL_SUFFIX)) continue;
    const subscriptions = await ctx.db
      .query("newsSubscriptions")
      .withIndex("by_profile_id_and_confirmed_at", (query) => query.eq("profileId", profile._id))
      .take(MAX_RELATIONS_PER_PROFILE + 1);
    const issuances = await ctx.db
      .query("ebookIssuances")
      .withIndex("by_profile_id", (query) => query.eq("profileId", profile._id))
      .take(MAX_RELATIONS_PER_PROFILE + 1);
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
  const suppressionDocs = await ctx.db.query("newsSuppressions").take(MAX_EXPORT_RECORDS + 1);
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
