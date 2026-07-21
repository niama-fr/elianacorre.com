import { start } from "@convex-dev/workflow";
import { Loops } from "@devwithbobby/loops";
import { components, internal } from "@ec/backend/api";
import { env, type ActionCtx, type MutationCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { createCapabilityToken } from "@ec/domain/helpers/capabilities";
import { getLink } from "@ec/domain/helpers/links";
import { getLoopsTaskDeliveryIdempotencyKey } from "@ec/domain/helpers/loops-tasks";
import type { LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { Profiles } from "@ec/domain/schemas/profiles";
import { ConvexError } from "convex/values";

import {
  replaceLoopsTaskWorkflows,
  createLoopsTask,
  getLoopsTask,
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
import { requireNewsletterLegalBundleAt } from "../data/newsletter-legal-bundles";
import { getProfileIdByEmail } from "../data/profiles";
import { applyEmailDeliveryRestriction } from "./email-delivery-restrictions";

// CLIENT ----------------------------------------------------------------------------------------------------------------------------------
const loops = new Loops(components.loops);

// ENQUEUE TASK ----------------------------------------------------------------------------------------------------------------------------
export async function enqueueDeleteContactForPrivacy(ctx: MutationCtx, { email, privacyAuditId }: DeleteForPrivacyOpts) {
  return await enqueueTask(ctx, { email, idempotencyKey: `privacy-contact-erasure:${privacyAuditId}`, kind: "deleteContact" });
}
type DeleteForPrivacyOpts = { email: string; privacyAuditId: Id<"privacyAudits"> };

export async function enqueueSendConfirmationEmail(ctx: MutationCtx, payload: EnqueueSendConfirmationEmailOpts) {
  return await enqueueTask(ctx, { ...payload, idempotencyKey: payload.newsConfirmationId, kind: "sendConfirmationEmail" });
}
type EnqueueSendConfirmationEmailOpts = Omit<LoopsTasks["SendConfirmationEmailCreate"], "idempotencyKey" | "kind">;

export async function enqueueSendEbookEmail(ctx: MutationCtx, payload: Omit<LoopsTasks["SendEbookEmailCreate"], "kind">) {
  return await enqueueTask(ctx, { ...payload, kind: "sendEbookEmail" });
}

export async function enqueueSyncContactForPrivacy(ctx: MutationCtx, { privacyAuditId, profileId }: ForPrivacyOpts) {
  return await enqueueSyncContact(ctx, {
    idempotencyKey: `privacy-contact-unsubscription:${privacyAuditId}`,
    profileId,
    subscribed: false,
  });
}
type ForPrivacyOpts = { privacyAuditId: Id<"privacyAudits">; profileId: Id<"profiles"> };

export async function enqueueSyncContactForReactivation(ctx: MutationCtx, { confirmation, profileId }: ForReactivationOpts) {
  return await enqueueSyncContact(ctx, {
    idempotencyKey: `news-contact-reactivation:${confirmation.restrictionId}:${confirmation.restrictionVersion}`,
    profileId,
    subscribed: true,
  });
}
type ForReactivationOpts = { confirmation: NewsConfirmations["ReactivationDoc"]; profileId: Id<"profiles"> };

export async function enqueueSyncContactForSubscription(ctx: MutationCtx, { profileId, subscriptionId }: ForSubscriptionOpts) {
  return await enqueueSyncContact(ctx, { idempotencyKey: `news-contact-subscription:${subscriptionId}`, profileId, subscribed: true });
}
type ForSubscriptionOpts = { profileId: Id<"profiles">; subscriptionId: Id<"newsSubscriptions"> };

export async function acknowledgeFailedLoopsTask(ctx: MutationCtx, loopsTaskId: Id<"loopsTasks">, now: number) {
  const task = await getLoopsTask(ctx, loopsTaskId);
  if (!task) throw new ConvexError("UNKNOWN_LOOPS_TASK");
  if (task.status !== "failed") throw new ConvexError("LOOPS_TASK_NOT_FAILED");
  await setLoopsTaskAcknowledgedAt(ctx, loopsTaskId, now);
}

export async function replayFailedLoopsTask(ctx: MutationCtx, task: LoopsTasks["Doc"]): Promise<string> {
  if (task.status !== "failed") throw new ConvexError("LOOPS_TASK_NOT_FAILED");
  const workflowId = await start(ctx, internal.loops.run, { loopsTaskId: task._id });
  await resetLoopsTaskForReplay(ctx, task, { replayCount: task.replayCount + 1, workflowIds: [workflowId, ...task.workflowIds] });
  return workflowId;
}

// EXECUTE TASK ----------------------------------------------------------------------------------------------------------------------------
export async function executeLoopsTask(ctx: ActionCtx, { profile, task }: ExecuteTaskOpts) {
  if (task.kind === "deleteContact") {
    if (task.email === null) throw new Error("Delete-contact task email was already redacted");
    await loops.deleteContact(ctx, task.email);
  } else if (!profile) throw new Error("Loops task profile is required");
  else if (task.kind === "syncContact") await syncContact(ctx, { profile, task });
  else if (task.kind === "sendConfirmationEmail") await sendConfirmationEmail(ctx, { profile, task });
  else if (task.kind === "sendEbookEmail") await sendEbookEmail(ctx, { profile, task });
}
type ExecuteTaskOpts = { profile: Profiles["Doc"] | null; task: LoopsTasks["Doc"] };

// PROCESS WEBHOOKS ------------------------------------------------------------------------------------------------------------------------
export async function processLoopsWebhook(ctx: MutationCtx, { email, kind, messageId, occurredAt, webhookId }: LoopsWebhooks["Create"]) {
  const existing = await getLoopsWebhookById(ctx, webhookId);
  if (existing) return;

  const id = await createLoopsWebhook(ctx, { email, kind, messageId, occurredAt, webhookId });
  const profileId = await getProfileIdByEmail(ctx, email);
  if (!profileId) return;

  if (kind === "email.unsubscribed") {
    const subscription = await getCurrentNewsSubscription(ctx, profileId);
    if (!subscription || occurredAt < subscription.requestedAt) return;
    await markNewsSubscriptionUnsubscribed(ctx, subscription._id, occurredAt);
  } else if (kind === "email.resubscribed") {
    const subscription = await getCurrentNewsSubscription(ctx, profileId);
    if (subscription) return;
    const [periods, latestRestriction] = await Promise.all([
      listNewsSubscriptionsNewestFirst(ctx, profileId),
      getLatestNewsRestriction(ctx, profileId),
    ]);
    let latestConsentEventAt = 0;
    for (const period of periods)
      latestConsentEventAt = Math.max(latestConsentEventAt, period.requestedAt, period.confirmedAt ?? 0, period.unsubscribedAt ?? 0);
    const latestRestrictionEventAt = latestRestriction ? Math.max(latestRestriction.lastOccurredAt, latestRestriction.resolvedAt ?? 0) : 0;
    if (occurredAt <= Math.max(latestConsentEventAt, latestRestrictionEventAt)) return;
    const { _id: legalBundleId } = await requireNewsletterLegalBundleAt(ctx, occurredAt);
    const subscriptionId = await createNewsSubscription(ctx, { legalBundleId, profileId, requestedAt: occurredAt });
    await markNewsSubscriptionConfirmed(ctx, subscriptionId, { confirmedFrom: "loops", now: occurredAt });
    const restriction = await getActiveNewsRestriction(ctx, profileId);
    await enqueueSyncContactForResubscription(ctx, { profileId, subscribed: restriction === null, webhookId: id });
    return;
  } else {
    const reason = kind === "email.hardBounced" ? "permanentBounce" : "spamComplaint";
    await applyEmailDeliveryRestriction(ctx, { occurredAt, profileId, reason });
  }

  await enqueueSyncContactForUnsubscription(ctx, { profileId, webhookId: id });
}

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
async function enqueueSyncContact(ctx: MutationCtx, payload: Omit<LoopsTasks["SyncContactCreate"], "kind">) {
  return await enqueueTask(ctx, { ...payload, kind: "syncContact" });
}

async function enqueueSyncContactForUnsubscription(ctx: MutationCtx, { profileId, webhookId }: ForUnsubscriptionOpts) {
  return await enqueueSyncContact(ctx, {
    idempotencyKey: `loops-webhook-contact-unsubscription:${webhookId}`,
    profileId,
    subscribed: false,
  });
}
type ForUnsubscriptionOpts = { profileId: Id<"profiles">; webhookId: Id<"loopsWebhooks"> };

async function enqueueSyncContactForResubscription(ctx: MutationCtx, payload: ForResubscriptionOpts) {
  const { profileId, subscribed, webhookId } = payload;
  return await enqueueSyncContact(ctx, {
    idempotencyKey: `loops-webhook-contact-resubscription:${webhookId}`,
    profileId,
    subscribed,
  });
}
type ForResubscriptionOpts = ForUnsubscriptionOpts & { subscribed: boolean };

async function enqueueTask(ctx: MutationCtx, payload: LoopsTasks["Create"]) {
  const loopsTaskId = await createLoopsTask(ctx, payload);
  const workflowId = await start(ctx, internal.loops.run, { loopsTaskId });
  await replaceLoopsTaskWorkflows(ctx, loopsTaskId, workflowId);
  return workflowId;
}

async function sendConfirmationEmail(ctx: ActionCtx, { profile, task }: SendConfirmationEmailOpts) {
  return await loops.sendTransactional(ctx, {
    dataVariables: {
      confirmationUrl: getLink({
        base: env.SITE_URL,
        path: "/newsletter/confirmation",
        token: await createCapabilityToken({ capabilityId: task.newsConfirmationId, secret: env.CAPABILITY_SIGNING_SECRET }),
      }),
      firstName: profile.firstName,
    },
    email: profile.email,
    idempotencyKey: getLoopsTaskDeliveryIdempotencyKey(task),
    transactionalId: env.LOOPS_CONFIRMATION_TRANSACTIONAL_ID,
  });
}
type SendConfirmationEmailOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SendConfirmationEmailDoc"] };

async function sendEbookEmail(ctx: ActionCtx, { profile, task }: SendEbookEmailOpts) {
  return await loops.sendTransactional(ctx, {
    dataVariables: {
      downloadUrl: getLink({
        base: env.SITE_URL,
        path: "/newsletter/ebook",
        token: await createCapabilityToken({ capabilityId: task.ebookDownloadId, secret: env.CAPABILITY_SIGNING_SECRET }),
      }),
      firstName: profile.firstName,
    },
    email: profile.email,
    idempotencyKey: getLoopsTaskDeliveryIdempotencyKey(task),
    transactionalId: env.LOOPS_EBOOK_TRANSACTIONAL_ID,
  });
}
type SendEbookEmailOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SendEbookEmailDoc"] };

async function syncContact(ctx: ActionCtx, { profile: { email, firstName, _id: userId }, task }: SyncContactOpts) {
  return task.subscribed
    ? await loops.addContact(ctx, {
        email,
        firstName,
        source: "elianacorre.com",
        subscribed: true,
        userGroup: "newsletter",
        userId,
      })
    : await loops.unsubscribeContact(ctx, email);
}
type SyncContactOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SyncContactDoc"] };
