import type { WorkflowId } from "@convex-dev/workflow";
import { start } from "@convex-dev/workflow";
import { Loops } from "@devwithbobby/loops";
import { components, internal } from "@ec/backend/api";
import type { Id } from "@ec/backend/types";
import { LoopsTaskNotFailed } from "@ec/domain/errors/loops-tasks";
import { createCapabilityToken } from "@ec/domain/helpers/capabilities";
import { getLink } from "@ec/domain/helpers/links";
import { getLoopsTaskDeliveryIdempotencyKey } from "@ec/domain/helpers/loops-tasks";
import type { LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { Profiles } from "@ec/domain/schemas/profiles";
import { Config, Effect as E, Option as O } from "effect";

import type { DatabaseWriter } from "../confect/_generated/services";
import { ActionCtx, MutationCtx } from "../confect/_generated/services";
import { requirePrivacyNoticeAt } from "../data/legal-texts";
import {
  replaceLoopsTaskWorkflows,
  createLoopsTask,
  requireLoopsTask,
  resetLoopsTaskForReplay,
  setLoopsTaskAcknowledgedAt,
} from "../data/loops-tasks";
import { createLoopsWebhook, getLoopsWebhookById } from "../data/loops-webhooks";
import { getActiveNewsRestriction, getLatestNewsRestriction } from "../data/news-restrictions";
import {
  createNewsSubscription,
  getCurrentNewsSubscription,
  listNewsSubscriptionsNewestFirst,
  markNewsSubscriptionConfirmed,
  markNewsSubscriptionUnsubscribed,
} from "../data/news-subscriptions";
import { getProfileIdByEmail } from "../data/profiles";
import { applyEmailDeliveryRestriction } from "./email-delivery-restrictions";

// CLIENT ----------------------------------------------------------------------------------------------------------------------------------
const loops = new Loops(components.loops);

// ENQUEUE TASK ----------------------------------------------------------------------------------------------------------------------------
export const enqueueDeleteContactForPrivacy = E.fn(function* ({ email, privacyAuditId }: DeleteForPrivacyOpts) {
  return yield* enqueueTask({ email, idempotencyKey: `privacy-contact-erasure:${privacyAuditId}`, kind: "deleteContact" });
});
type DeleteForPrivacyOpts = { email: string; privacyAuditId: Id<"privacyAudits"> };

export const enqueueSendConfirmationEmail = E.fn(function* (payload: EnqueueSendConfirmationEmailOpts) {
  return yield* enqueueTask({ ...payload, idempotencyKey: payload.newsConfirmationId, kind: "sendConfirmationEmail" });
});
type EnqueueSendConfirmationEmailOpts = Omit<LoopsTasks["SendConfirmationEmailCreate"], "idempotencyKey" | "kind">;

export const enqueueSendEbookEmail = E.fn(function* (payload: Omit<LoopsTasks["SendEbookEmailCreate"], "kind">) {
  return yield* enqueueTask({ ...payload, kind: "sendEbookEmail" });
});

export const enqueueSyncContactForPrivacy = E.fn(function* ({ privacyAuditId, profileId }: ForPrivacyOpts) {
  return yield* enqueueSyncContact({
    idempotencyKey: `privacy-contact-unsubscription:${privacyAuditId}`,
    profileId,
    subscribed: false,
  });
});
type ForPrivacyOpts = { privacyAuditId: Id<"privacyAudits">; profileId: Id<"profiles"> };

export const enqueueSyncContactForReactivation = E.fn(function* ({ confirmation, profileId }: ForReactivationOpts) {
  return yield* enqueueSyncContact({
    idempotencyKey: `news-contact-reactivation:${confirmation.restrictionId}:${confirmation.restrictionVersion}`,
    profileId,
    subscribed: true,
  });
});
type ForReactivationOpts = { confirmation: NewsConfirmations["ReactivationDoc"]; profileId: Id<"profiles"> };

export const enqueueSyncContactForSubscription = E.fn(function* ({ profileId, subscriptionId }: ForSubscriptionOpts) {
  return yield* enqueueSyncContact({ idempotencyKey: `news-contact-subscription:${subscriptionId}`, profileId, subscribed: true });
});
type ForSubscriptionOpts = { profileId: Id<"profiles">; subscriptionId: Id<"newsSubscriptions"> };

export const acknowledgeFailedLoopsTask = E.fn(function* (loopsTaskId: Id<"loopsTasks">, now: number) {
  const task = yield* requireLoopsTask(loopsTaskId);
  if (task.status !== "failed") return yield* new LoopsTaskNotFailed();
  yield* setLoopsTaskAcknowledgedAt(loopsTaskId, now);
});

export const replayFailedLoopsTask = E.fn(function* (
  task: LoopsTasks["Doc"]
): E.fn.Return<WorkflowId, LoopsTaskNotFailed, DatabaseWriter | MutationCtx> {
  const ctx = yield* MutationCtx;
  if (task.status !== "failed") return yield* new LoopsTaskNotFailed();
  const workflowId = yield* E.promise(async () => await start(ctx, internal.loops.run, { loopsTaskId: task._id }));
  yield* resetLoopsTaskForReplay(task, { replayCount: task.replayCount + 1, workflowIds: [workflowId, ...task.workflowIds] });
  return workflowId;
});

// EXECUTE TASK ----------------------------------------------------------------------------------------------------------------------------
export const executeLoopsTask = E.fn(function* ({ profile, task }: ExecuteTaskOpts) {
  const ctx = yield* ActionCtx;
  if (task.kind === "deleteContact") {
    if (task.email === null) throw new Error("Delete-contact task email was already redacted");
    yield* E.promise(async () => await loops.deleteContact(ctx, task.email));
  } else if (!profile) throw new Error("Loops task profile is required");
  else if (task.kind === "syncContact") yield* syncContact({ profile, task });
  else if (task.kind === "sendConfirmationEmail") yield* sendConfirmationEmail({ profile, task });
  else if (task.kind === "sendEbookEmail") yield* sendEbookEmail({ profile, task });
});
type ExecuteTaskOpts = { profile: Profiles["Doc"] | null; task: LoopsTasks["Doc"] };

// PROCESS WEBHOOKS ------------------------------------------------------------------------------------------------------------------------
export const processLoopsWebhook = E.fn(function* ({ email, kind, messageId, occurredAt, webhookId }: LoopsWebhooks["Create"]) {
  const existing = yield* getLoopsWebhookById(webhookId);
  if (O.isSome(existing)) return;
  const id = yield* createLoopsWebhook({ email, kind, messageId, occurredAt, webhookId });
  const profileId = yield* getProfileIdByEmail(email);
  if (O.isNone(profileId)) return;
  if (kind === "email.unsubscribed") {
    const subscription = yield* getCurrentNewsSubscription(profileId.value);
    if (O.isNone(subscription) || occurredAt < subscription.value.requestedAt) return;
    yield* markNewsSubscriptionUnsubscribed(subscription.value._id, occurredAt);
  } else if (kind === "email.resubscribed") {
    const subscription = yield* getCurrentNewsSubscription(profileId.value);
    if (O.isSome(subscription)) return;
    const [periods, latestRestriction] = yield* E.all([
      listNewsSubscriptionsNewestFirst(profileId.value),
      getLatestNewsRestriction(profileId.value),
    ]);
    let latestConsentEventAt = 0;
    for (const period of periods)
      latestConsentEventAt = Math.max(latestConsentEventAt, period.requestedAt, period.confirmedAt ?? 0, period.unsubscribedAt ?? 0);
    const latestRestrictionEventAt = O.isSome(latestRestriction)
      ? Math.max(latestRestriction.value.lastOccurredAt, latestRestriction.value.resolvedAt ?? 0)
      : 0;
    if (occurredAt <= Math.max(latestConsentEventAt, latestRestrictionEventAt)) return;
    const { _id: privacyNoticeId } = yield* requirePrivacyNoticeAt(occurredAt);
    const subscriptionId = yield* createNewsSubscription({ privacyNoticeId, profileId: profileId.value, requestedAt: occurredAt });
    yield* markNewsSubscriptionConfirmed(subscriptionId, { confirmedFrom: "loops", now: occurredAt });
    const restriction = yield* getActiveNewsRestriction(profileId.value);
    yield* enqueueSyncContactForResubscription({
      profileId: profileId.value,
      subscribed: O.isNone(restriction),
      webhookId: id,
    });
    return;
  } else {
    const reason = kind === "email.hardBounced" ? "permanentBounce" : "spamComplaint";
    yield* applyEmailDeliveryRestriction({ occurredAt, profileId: profileId.value, reason });
  }
  yield* enqueueSyncContactForUnsubscription({ profileId: profileId.value, webhookId: id });
});

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
const enqueueSyncContact = E.fn(function* (payload: Omit<LoopsTasks["SyncContactCreate"], "kind">) {
  return yield* enqueueTask({ ...payload, kind: "syncContact" });
});

const enqueueSyncContactForUnsubscription = E.fn(function* ({ profileId, webhookId }: ForUnsubscriptionOpts) {
  return yield* enqueueSyncContact({
    idempotencyKey: `loops-webhook-contact-unsubscription:${webhookId}`,
    profileId,
    subscribed: false,
  });
});
type ForUnsubscriptionOpts = { profileId: Id<"profiles">; webhookId: Id<"loopsWebhooks"> };

const enqueueSyncContactForResubscription = E.fn(function* (payload: ForResubscriptionOpts) {
  const { profileId, subscribed, webhookId } = payload;
  return yield* enqueueSyncContact({
    idempotencyKey: `loops-webhook-contact-resubscription:${webhookId}`,
    profileId,
    subscribed,
  });
});
type ForResubscriptionOpts = ForUnsubscriptionOpts & { subscribed: boolean };

const enqueueTask = E.fn(function* (payload: LoopsTasks["Create"]): E.fn.Return<WorkflowId, never, MutationCtx | DatabaseWriter> {
  const ctx = yield* MutationCtx;
  const loopsTaskId = yield* createLoopsTask(payload);
  const workflowId = yield* E.promise(async () => await start(ctx, internal.loops.run, { loopsTaskId }));
  yield* replaceLoopsTaskWorkflows(loopsTaskId, workflowId);
  return workflowId;
});

const sendConfirmationEmail = E.fn(function* ({ profile, task }: SendConfirmationEmailOpts) {
  const ctx = yield* ActionCtx;
  const email = requireProfileEmail(profile);
  const secret = yield* Config.string("CAPABILITY_SIGNING_SECRET").pipe(E.orDie);
  const token = yield* createCapabilityToken({ capabilityId: task.newsConfirmationId, secret });
  const base = yield* Config.string("SITE_URL").pipe(E.orDie);
  const transactionalId = yield* Config.string("LOOPS_CONFIRMATION_TRANSACTIONAL_ID").pipe(E.orDie);
  return yield* E.promise(
    async () =>
      await loops.sendTransactional(ctx, {
        dataVariables: { confirmationUrl: getLink({ base, path: "/newsletter/confirmation", token }), firstName: profile.firstName },
        email,
        idempotencyKey: getLoopsTaskDeliveryIdempotencyKey(task),
        transactionalId,
      })
  );
});
type SendConfirmationEmailOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SendConfirmationEmailDoc"] };

const sendEbookEmail = E.fn(function* ({ profile, task }: SendEbookEmailOpts) {
  const ctx = yield* ActionCtx;
  const email = requireProfileEmail(profile);
  const secret = yield* Config.string("CAPABILITY_SIGNING_SECRET").pipe(E.orDie);
  const token = yield* createCapabilityToken({ capabilityId: task.ebookDownloadId, secret });
  const base = yield* Config.string("SITE_URL").pipe(E.orDie);
  const transactionalId = yield* Config.string("LOOPS_CONFIRMATION_TRANSACTIONAL_ID").pipe(E.orDie);
  return yield* E.promise(
    async () =>
      await loops.sendTransactional(ctx, {
        dataVariables: { downloadUrl: getLink({ base, path: "/newsletter/ebook", token }), firstName: profile.firstName },
        email,
        idempotencyKey: getLoopsTaskDeliveryIdempotencyKey(task),
        transactionalId,
      })
  );
});
type SendEbookEmailOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SendEbookEmailDoc"] };

const syncContact = E.fn(function* ({ profile: { email, firstName, _id: userId }, task }: SyncContactOpts) {
  if (!email) throw new Error("Loops task profile email is required");
  const ctx = yield* ActionCtx;
  return task.subscribed
    ? yield* E.promise(
        async () =>
          await loops.addContact(ctx, {
            email,
            firstName,
            source: "elianacorre.com",
            subscribed: true,
            userGroup: "newsletter",
            userId,
          })
      )
    : yield* E.promise(async () => await loops.unsubscribeContact(ctx, email));
});
type SyncContactOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SyncContactDoc"] };

function requireProfileEmail(profile: Profiles["Doc"]): string {
  if (!profile.email) throw new Error("Loops task profile email is required");
  return profile.email;
}
