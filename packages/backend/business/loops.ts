import { start } from "@convex-dev/workflow";
import { Loops } from "@devwithbobby/loops";
import { components, internal } from "@ec/backend/api";
import { env, type ActionCtx, type MutationCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { createCapabilityToken } from "@ec/domain/helpers/capabilities";
import { getLink } from "@ec/domain/helpers/links";
import type { LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { Profiles } from "@ec/domain/schemas/profiles";
import { ConvexError } from "convex/values";

import { createLoopsTask, patchLoopsTask } from "../data/loops-tasks";
import { createLoopsWebhook, getLoopsWebhookById } from "../data/loops-webhooks";
import { getCurrentNewsSubscription, markNewsSubscriptionUnsubscribed } from "../data/news-subscriptions";
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

export async function replayFailedLoopsTask(ctx: MutationCtx, task: LoopsTasks["Doc"]): Promise<string> {
  if (task.status !== "failed") throw new ConvexError("LOOPS_TASK_NOT_FAILED");
  const workflowId: string = await start(ctx, internal.loops.run, { loopsTaskId: task._id });
  const previousWorkflowIds = task.workflowIds ?? (task.workflowId === null ? [] : [task.workflowId]);
  await patchLoopsTask(ctx, task._id, {
    acknowledgedAt: null,
    alertedAt: null,
    error: null,
    failureCategory: null,
    failureCode: null,
    failureStatus: null,
    finishedAt: null,
    replayCount: (task.replayCount ?? 0) + 1,
    status: "pending",
    workflowId,
    workflowIds: [...previousWorkflowIds, workflowId],
  });
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

async function enqueueTask(ctx: MutationCtx, payload: LoopsTasks["Create"]) {
  const loopsTaskId = await createLoopsTask(ctx, payload);
  const workflowId = await start(ctx, internal.loops.run, { loopsTaskId });
  await patchLoopsTask(ctx, loopsTaskId, { workflowId, workflowIds: [workflowId] });
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
    idempotencyKey: task.idempotencyKey,
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
    idempotencyKey: task.idempotencyKey,
    transactionalId: env.LOOPS_EBOOK_TRANSACTIONAL_ID,
  });
}
type SendEbookEmailOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SendEbookEmailDoc"] };

async function syncContact(ctx: ActionCtx, { profile: { email, firstName, lastName, _id: userId }, task }: SyncContactOpts) {
  return task.subscribed
    ? await loops.addContact(ctx, {
        email,
        firstName,
        lastName,
        source: "elianacorre.com",
        subscribed: true,
        userGroup: "newsletter",
        userId,
      })
    : await loops.unsubscribeContact(ctx, email);
}
type SyncContactOpts = { profile: Profiles["Doc"]; task: LoopsTasks["SyncContactDoc"] };
