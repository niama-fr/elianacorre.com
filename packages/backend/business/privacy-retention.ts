import type { MutationCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { calendarYearsBefore } from "@ec/domain/helpers/datetime";
import { anonymizedEmailFor, isAnonymizedEmail } from "@ec/domain/helpers/newsletter";
import type { RetentionRuns } from "@ec/domain/schemas/retention-runs";
import type { WithNow } from "@ec/domain/schemas/utils";

import { deleteContactRequest, takeProfileContactRequests } from "../data/contact-requests";
import { deleteEbookDownload, paginateExpiredEbookDownloads, takeEbookIssuanceDownloads } from "../data/ebook-downloads";
import { deleteEbookIssuance, takeEbookIssuances } from "../data/ebook-issuances";
import { getIdentityByProfileId } from "../data/identities";
import { deleteLoopsTask, getLoopsTaskByEbookDownload, paginateExpiredLoopsTasks, takeProfileLoopsTasks } from "../data/loops-tasks";
import { deleteLoopsWebhook, paginateExpiredLoopsWebhooks, patchLoopsWebhook, takeLoopsWebhooksByEmail } from "../data/loops-webhooks";
import { deleteNewsConfirmation, takeNewsConfirmationsBySubscriptionId } from "../data/news-confirmations";
import { takeNewsSubscriptions } from "../data/news-subscriptions";
import { getProfile, paginateProfiles, patchProfile } from "../data/profiles";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_BATCH_SIZE = 100;
const PROFILE_RETENTION_BATCH_SIZE = 1;
const MAX_RETENTION_RELATIONS_PER_PROFILE = 20;

export const PENDING_RETENTION_MS = 30 * DAY_MS;
export const TECHNICAL_RETENTION_MS = 90 * DAY_MS;
export const getContactRequestCutoff = (now: number) => calendarYearsBefore(now, 1);
export const getFormerSubscriberCutoff = (now: number) => calendarYearsBefore(now, 3);

const emptyCounts = (): RetentionRuns["Counts"] => ({
  anonymizedFormerProfiles: 0,
  anonymizedPendingProfiles: 0,
  deletedDownloads: 0,
  deletedTechnicalLogs: 0,
});

// ENFORCE BATCH ---------------------------------------------------------------------------------------------------------------------------
export async function enforcePrivacyRetentionBatch(
  ctx: MutationCtx,
  { cursor, now, phase }: WithNow<{ cursor: string | null; phase: RetentionRuns["FailurePhase"] }>
): Promise<PrivacyRetentionBatchResult> {
  if (phase === "downloads") return await deleteExpiredDownloads(ctx, { cursor, now });
  if (phase === "tasks") return await deleteExpiredTasks(ctx, { cursor, now });
  if (phase === "webhooks") return await deleteExpiredWebhooks(ctx, { cursor, now });
  return await expireProfiles(ctx, { cursor, now });
}

// INTERNALS -------------------------------------------------------------------------------------------------------------------------------
async function anonymizeNewsletterProfile(
  ctx: MutationCtx,
  { anonymousEmail, profileId }: { anonymousEmail: string; profileId: Id<"profiles"> }
) {
  const profile = await getProfile(ctx, profileId);
  if (!profile) return;
  const webhooks = await takeLoopsWebhooksByEmail(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile.email);
  requireBoundedRelations(webhooks, MAX_RETENTION_RELATIONS_PER_PROFILE);
  for (const webhook of webhooks) await patchLoopsWebhook(ctx, webhook._id, { email: anonymousEmail });
  await patchProfile(ctx, profileId, { email: anonymousEmail, firstName: undefined });
}

async function deleteExpiredDownloads(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<PrivacyRetentionBatchResult> {
  const result = await paginateExpiredEbookDownloads(ctx, { cursor, numItems: RETENTION_BATCH_SIZE }, now - TECHNICAL_RETENTION_MS);
  let deletedDownloads = 0;
  for (const download of result.page) {
    const deliveryTask = await getLoopsTaskByEbookDownload(ctx, download._id);
    if (deliveryTask?.status === "pending") continue;
    await deleteEbookDownload(ctx, download._id);
    deletedDownloads += 1;
  }
  return nextBatch("downloads", "profiles", result, { ...emptyCounts(), deletedDownloads });
}

async function deleteExpiredTasks(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<PrivacyRetentionBatchResult> {
  const result = await paginateExpiredLoopsTasks(ctx, { cursor, numItems: RETENTION_BATCH_SIZE }, now - TECHNICAL_RETENTION_MS);
  let deletedTechnicalLogs = 0;
  for (const task of result.page)
    if (task.finishedAt !== null && task.finishedAt <= now - TECHNICAL_RETENTION_MS) {
      await deleteLoopsTask(ctx, task._id);
      deletedTechnicalLogs += 1;
    }
  return nextBatch("tasks", "webhooks", result, { ...emptyCounts(), deletedTechnicalLogs });
}

async function deleteExpiredWebhooks(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<PrivacyRetentionBatchResult> {
  const result = await paginateExpiredLoopsWebhooks(ctx, { cursor, numItems: RETENTION_BATCH_SIZE }, now - TECHNICAL_RETENTION_MS);
  for (const webhook of result.page) await deleteLoopsWebhook(ctx, webhook._id);
  return nextBatch("webhooks", "downloads", result, { ...emptyCounts(), deletedTechnicalLogs: result.page.length });
}

async function expireFormerProfile(ctx: MutationCtx, profileId: Id<"profiles">) {
  const [issuances, tasks] = await Promise.all([
    takeEbookIssuances(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profileId),
    takeProfileLoopsTasks(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profileId),
  ]);
  requireBoundedRelations(issuances, MAX_RETENTION_RELATIONS_PER_PROFILE);
  requireBoundedRelations(tasks, MAX_RETENTION_RELATIONS_PER_PROFILE);
  const downloadsByIssuance = await Promise.all(
    issuances.map(async (issuance) => await takeEbookIssuanceDownloads(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, issuance._id))
  );
  for (const downloads of downloadsByIssuance) requireBoundedRelations(downloads, MAX_RETENTION_RELATIONS_PER_PROFILE);
  for (const [issuanceIndex, issuance] of issuances.entries()) {
    const downloads = downloadsByIssuance[issuanceIndex] ?? [];
    for (const download of downloads) {
      for (const task of tasks)
        if (task.kind === "sendEbookEmail" && task.ebookDownloadId === download._id) await deleteLoopsTask(ctx, task._id);
      await deleteEbookDownload(ctx, download._id);
    }
    await deleteEbookIssuance(ctx, issuance._id);
  }
  await anonymizeNewsletterProfile(ctx, {
    anonymousEmail: anonymizedEmailFor(profileId),
    profileId,
  });
}

async function expirePendingNewsletterProfile(
  ctx: MutationCtx,
  options: {
    anonymousEmail: string;
    profileId: Id<"profiles">;
    shouldAnonymize: boolean;
    subscriptionIds: Id<"newsSubscriptions">[];
  }
) {
  const { anonymousEmail, profileId, shouldAnonymize, subscriptionIds } = options;
  const tasks = await takeProfileLoopsTasks(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profileId);
  requireBoundedRelations(tasks, MAX_RETENTION_RELATIONS_PER_PROFILE);
  const confirmationsBySubscription = await Promise.all(
    subscriptionIds.map(
      async (subscriptionId) => await takeNewsConfirmationsBySubscriptionId(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, subscriptionId)
    )
  );
  for (const confirmations of confirmationsBySubscription) requireBoundedRelations(confirmations, MAX_RETENTION_RELATIONS_PER_PROFILE);
  for (const confirmations of confirmationsBySubscription)
    for (const confirmation of confirmations) {
      for (const task of tasks)
        if (task.kind === "sendConfirmationEmail" && task.newsConfirmationId === confirmation._id) await deleteLoopsTask(ctx, task._id);
      await deleteNewsConfirmation(ctx, confirmation._id);
    }

  if (shouldAnonymize) await anonymizeNewsletterProfile(ctx, { anonymousEmail, profileId });
}

async function expireProfiles(ctx: MutationCtx, { cursor, now }: BatchOptions): Promise<PrivacyRetentionBatchResult> {
  const result = await paginateProfiles(ctx, { cursor, numItems: PROFILE_RETENTION_BATCH_SIZE });
  const counts = emptyCounts();
  for (const profile of result.page) {
    if (isAnonymizedEmail(profile.email)) continue;

    const [contactRequests, identity, subscriptions] = await Promise.all([
      takeProfileContactRequests(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile._id),
      getIdentityByProfileId(ctx, profile._id),
      takeNewsSubscriptions(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile._id),
    ]);
    requireBoundedRelations(contactRequests);
    for (const contactRequest of contactRequests)
      if (contactRequest._creationTime <= getContactRequestCutoff(now)) await deleteContactRequest(ctx, contactRequest._id);
    const hasSeparateRelationship = !!identity;

    requireBoundedRelations(subscriptions);
    if (subscriptions.length === 0) {
      const hasCurrentContactRequest = contactRequests.some(({ _creationTime }) => _creationTime > getContactRequestCutoff(now));
      if (hasSeparateRelationship || hasCurrentContactRequest) continue;
      const ebookIssuances = await takeEbookIssuances(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile._id);
      requireBoundedRelations(ebookIssuances);
      if (ebookIssuances.length > 0) continue;
      await anonymizeNewsletterProfile(ctx, { anonymousEmail: anonymizedEmailFor(profile._id), profileId: profile._id });
      continue;
    }

    const isExpiredPending = subscriptions.every(
      ({ confirmedAt, requestedAt }) => confirmedAt === null && requestedAt <= now - PENDING_RETENTION_MS
    );
    if (isExpiredPending) {
      await expirePendingNewsletterProfile(ctx, {
        anonymousEmail: anonymizedEmailFor(profile._id),
        profileId: profile._id,
        shouldAnonymize: !hasSeparateRelationship,
        subscriptionIds: subscriptions.map(({ _id }) => _id),
      });
      if (!hasSeparateRelationship) counts.anonymizedPendingProfiles += 1;
      continue;
    }

    if (hasSeparateRelationship) continue;
    const ebookIssuances = await takeEbookIssuances(ctx, MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile._id);
    requireBoundedRelations(ebookIssuances);
    const latestActivityAt = Math.max(
      ...subscriptions.map(({ requestedAt, unsubscribedAt }) => unsubscribedAt ?? requestedAt),
      ...contactRequests
        .filter(({ _creationTime }) => _creationTime > getContactRequestCutoff(now))
        .map(({ _creationTime }) => _creationTime),
      ...ebookIssuances.map(({ _creationTime }) => _creationTime)
    );
    const isFormerSubscriber =
      subscriptions.some(({ confirmedAt }) => confirmedAt !== null) && subscriptions.every(({ unsubscribedAt }) => unsubscribedAt !== null);
    if (!isFormerSubscriber || latestActivityAt > getFormerSubscriberCutoff(now)) continue;
    await expireFormerProfile(ctx, profile._id);
    counts.anonymizedFormerProfiles += 1;
  }
  return result.isDone
    ? { ...counts, cursor: null, done: true, phase: "profiles" }
    : { ...counts, cursor: result.continueCursor, done: false, phase: "profiles" };
}

function nextBatch(
  currentPhase: RetentionRuns["FailurePhase"],
  nextPhase: RetentionRuns["FailurePhase"],
  page: { continueCursor: string; isDone: boolean },
  counts: RetentionRuns["Counts"]
): PrivacyRetentionBatchResult {
  return page.isDone
    ? { ...counts, cursor: null, done: false, phase: nextPhase }
    : { ...counts, cursor: page.continueCursor, done: false, phase: currentPhase };
}

function requireBoundedRelations(records: readonly unknown[], maxRelations = MAX_RETENTION_RELATIONS_PER_PROFILE) {
  if (records.length > maxRelations) throw new Error("RETENTION_RELATION_LIMIT_EXCEEDED");
}

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type PrivacyRetentionBatchResult = RetentionRuns["Counts"] & {
  cursor: string | null;
  done: boolean;
  phase: RetentionRuns["FailurePhase"];
};

type BatchOptions = { cursor: string | null; now: number };
