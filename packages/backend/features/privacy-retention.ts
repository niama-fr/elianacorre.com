import type { Id } from "@ec/backend/types";
import { calendarYearsBefore } from "@ec/domain/helpers/datetime";
import { anonymizedEmailFor, isAnonymizedEmail } from "@ec/domain/helpers/newsletter";
import type { RetentionRuns } from "@ec/domain/schemas/retention-runs";
import type { WithNow } from "@ec/domain/schemas/utils";
import { Effect as E, Option as O } from "effect";

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

const emptyCounts = () =>
  ({
    anonymizedFormerProfiles: 0,
    anonymizedPendingProfiles: 0,
    deletedDownloads: 0,
    deletedTechnicalLogs: 0,
  }) satisfies RetentionRuns["Counts"];

// EXECUTE WORKFLOW ------------------------------------------------------------------------------------------------------------------------
export const executeRetentionWorkflow = <Error_>({
  markCompleted,
  markFailed,
  runBatch,
}: ExecuteWorkflowOpts<Error_>): E.Effect<void, Error_> =>
  E.gen(function* () {
    let cursor: string | null = null;
    let phase: PrivacyRetentionBatchResult["phase"] = "tasks";
    let stepNumber = 0;

    return yield* E.gen(function* () {
      while (true) {
        const { cursor: nextCursor, done, phase: nextPhase } = yield* runBatch({ cursor, phase, stepNumber });

        if (done) break;

        cursor = nextCursor;
        phase = nextPhase;
        stepNumber += 1;
      }

      yield* markCompleted();
    }).pipe(E.catch((error) => markFailed(phase).pipe(E.andThen(E.fail(error)))));
  });
type ExecuteWorkflowOpts<Error_> = {
  markCompleted: () => E.Effect<void, Error_>;
  markFailed: (phase: PrivacyRetentionBatchResult["phase"]) => E.Effect<void, Error_>;
  runBatch: (options: {
    cursor: string | null;
    phase: PrivacyRetentionBatchResult["phase"];
    stepNumber: number;
  }) => E.Effect<PrivacyRetentionBatchResult, Error_>;
};

// ENFORCE BATCH ---------------------------------------------------------------------------------------------------------------------------
export const enforcePrivacyRetentionBatch = E.fn(function* ({
  cursor,
  now,
  phase,
}: WithNow<{ cursor: string | null; phase: RetentionRuns["FailurePhase"] }>) {
  if (phase === "downloads") return yield* deleteExpiredDownloads({ cursor, now });
  if (phase === "tasks") return yield* deleteExpiredTasks({ cursor, now });
  if (phase === "webhooks") return yield* deleteExpiredWebhooks({ cursor, now });
  return yield* expireProfiles({ cursor, now });
});

// INTERNALS -------------------------------------------------------------------------------------------------------------------------------
const anonymizeNewsletterProfile = E.fn(function* ({ anonymousEmail, profileId }: { anonymousEmail: string; profileId: Id<"profiles"> }) {
  const profile = yield* getProfile(profileId);
  if (O.isNone(profile) || !profile.value.email) return;
  const webhooks = yield* takeLoopsWebhooksByEmail(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile.value.email);
  requireBoundedRelations(webhooks, MAX_RETENTION_RELATIONS_PER_PROFILE);
  for (const webhook of webhooks) yield* patchLoopsWebhook(webhook._id, { email: anonymousEmail });
  yield* patchProfile(profileId, { email: anonymousEmail, firstName: undefined });
});

const deleteExpiredDownloads = E.fn(function* ({ cursor, now }: BatchOptions) {
  const result = yield* paginateExpiredEbookDownloads({ cursor, numItems: RETENTION_BATCH_SIZE }, now - TECHNICAL_RETENTION_MS);
  let deletedDownloads = 0;
  for (const download of result.page) {
    const deliveryTask = yield* getLoopsTaskByEbookDownload(download._id);
    if (O.isSome(deliveryTask) && deliveryTask.value.status === "pending") continue;
    yield* deleteEbookDownload(download._id);
    deletedDownloads += 1;
  }
  return nextBatch("downloads", "profiles", result, { ...emptyCounts(), deletedDownloads });
});

const deleteExpiredTasks = E.fn(function* ({ cursor, now }: BatchOptions) {
  const result = yield* paginateExpiredLoopsTasks({ cursor, numItems: RETENTION_BATCH_SIZE }, now - TECHNICAL_RETENTION_MS);
  let deletedTechnicalLogs = 0;
  for (const task of result.page)
    if (task.finishedAt !== null && task.finishedAt <= now - TECHNICAL_RETENTION_MS) {
      yield* deleteLoopsTask(task._id);
      deletedTechnicalLogs += 1;
    }
  return nextBatch("tasks", "webhooks", result, { ...emptyCounts(), deletedTechnicalLogs });
});

const deleteExpiredWebhooks = E.fn(function* ({ cursor, now }: BatchOptions) {
  const result = yield* paginateExpiredLoopsWebhooks({ cursor, numItems: RETENTION_BATCH_SIZE }, now - TECHNICAL_RETENTION_MS);
  for (const webhook of result.page) yield* deleteLoopsWebhook(webhook._id);
  return nextBatch("webhooks", "downloads", result, { ...emptyCounts(), deletedTechnicalLogs: result.page.length });
});

const expireFormerProfile = E.fn(function* (profileId: Id<"profiles">) {
  const [issuances, tasks] = yield* E.all([
    takeEbookIssuances(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profileId),
    takeProfileLoopsTasks(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profileId),
  ]);
  requireBoundedRelations(issuances, MAX_RETENTION_RELATIONS_PER_PROFILE);
  requireBoundedRelations(tasks, MAX_RETENTION_RELATIONS_PER_PROFILE);
  const downloadsByIssuance = yield* E.all(
    issuances.map((issuance) => takeEbookIssuanceDownloads(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, issuance._id))
  );
  for (const downloads of downloadsByIssuance) requireBoundedRelations(downloads, MAX_RETENTION_RELATIONS_PER_PROFILE);
  for (const [issuanceIndex, issuance] of issuances.entries()) {
    const downloads = downloadsByIssuance[issuanceIndex] ?? [];
    for (const download of downloads) {
      for (const task of tasks)
        if (task.kind === "sendEbookEmail" && task.ebookDownloadId === download._id) yield* deleteLoopsTask(task._id);
      yield* deleteEbookDownload(download._id);
    }
    yield* deleteEbookIssuance(issuance._id);
  }
  yield* anonymizeNewsletterProfile({ anonymousEmail: anonymizedEmailFor(profileId), profileId });
});

const expirePendingNewsletterProfile = E.fn(function* (options: {
  anonymousEmail: string;
  profileId: Id<"profiles">;
  shouldAnonymize: boolean;
  subscriptionIds: Id<"newsSubscriptions">[];
}) {
  const { anonymousEmail, profileId, shouldAnonymize, subscriptionIds } = options;
  const tasks = yield* takeProfileLoopsTasks(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profileId);
  requireBoundedRelations(tasks, MAX_RETENTION_RELATIONS_PER_PROFILE);
  const confirmationsBySubscription = yield* E.all(
    subscriptionIds.map((subscriptionId) => takeNewsConfirmationsBySubscriptionId(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, subscriptionId))
  );
  for (const confirmations of confirmationsBySubscription) requireBoundedRelations(confirmations, MAX_RETENTION_RELATIONS_PER_PROFILE);
  for (const confirmations of confirmationsBySubscription)
    for (const confirmation of confirmations) {
      for (const task of tasks)
        if (task.kind === "sendConfirmationEmail" && task.newsConfirmationId === confirmation._id) yield* deleteLoopsTask(task._id);
      yield* deleteNewsConfirmation(confirmation._id);
    }
  if (shouldAnonymize) yield* anonymizeNewsletterProfile({ anonymousEmail, profileId });
});

const expireProfiles = E.fn("expireProfiles")(function* ({ cursor, now }: BatchOptions) {
  const result = yield* paginateProfiles({ cursor, numItems: PROFILE_RETENTION_BATCH_SIZE });
  const counts = emptyCounts();
  for (const profile of result.page) {
    if (!profile.email || isAnonymizedEmail(profile.email)) continue;
    const [contactRequests, identity, subscriptions] = yield* E.all([
      takeProfileContactRequests(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile._id),
      getIdentityByProfileId(profile._id),
      takeNewsSubscriptions(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile._id),
    ]);
    requireBoundedRelations(contactRequests);
    for (const contactRequest of contactRequests)
      if (contactRequest._creationTime <= getContactRequestCutoff(now)) yield* deleteContactRequest(contactRequest._id);
    const hasSeparateRelationship = O.isSome(identity);
    requireBoundedRelations(subscriptions);
    if (subscriptions.length === 0) {
      const hasCurrentContactRequest = contactRequests.some(({ _creationTime }) => _creationTime > getContactRequestCutoff(now));
      if (hasSeparateRelationship || hasCurrentContactRequest) continue;
      const ebookIssuances = yield* takeEbookIssuances(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile._id);
      requireBoundedRelations(ebookIssuances);
      if (ebookIssuances.length > 0) continue;
      yield* anonymizeNewsletterProfile({ anonymousEmail: anonymizedEmailFor(profile._id), profileId: profile._id });
      continue;
    }
    const isExpiredPending = subscriptions.every(
      ({ confirmedAt, requestedAt }) => confirmedAt === null && requestedAt <= now - PENDING_RETENTION_MS
    );
    if (isExpiredPending) {
      yield* expirePendingNewsletterProfile({
        anonymousEmail: anonymizedEmailFor(profile._id),
        profileId: profile._id,
        shouldAnonymize: !hasSeparateRelationship,
        subscriptionIds: subscriptions.map(({ _id }) => _id),
      });
      if (!hasSeparateRelationship) counts.anonymizedPendingProfiles += 1;
      continue;
    }
    if (hasSeparateRelationship) continue;
    const ebookIssuances = yield* takeEbookIssuances(MAX_RETENTION_RELATIONS_PER_PROFILE + 1, profile._id);
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
    yield* expireFormerProfile(profile._id);
    counts.anonymizedFormerProfiles += 1;
  }
  return result.isDone
    ? { ...counts, cursor: null, done: true, phase: "profiles" as const }
    : { ...counts, cursor: result.continueCursor, done: false, phase: "profiles" as const };
});

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
