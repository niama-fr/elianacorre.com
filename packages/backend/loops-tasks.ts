import { start } from "@convex-dev/workflow";
import type { LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import type { NewsConfirmations } from "@ec/domain/schemas/news-confirmations";
import type { WithNow } from "@ec/domain/schemas/utils";
import { ConvexError } from "convex/values";

import { internal } from "./convex/_generated/api";
import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getLoopsTask = async (ctx: QueryCtx, id: Id<"loopsTasks">) => await ctx.db.get("loopsTasks", id);

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireLoopsTask = async (ctx: QueryCtx, id: Id<"loopsTasks">) => {
  const doc = await getLoopsTask(ctx, id);
  if (!doc) throw new ConvexError("UNKNOWN_LOOPS_TASK");
  return doc;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const createLoopsTask = async (ctx: MutationCtx, create: LoopsTasks["Create"]) =>
  await ctx.db.insert("loopsTasks", { ...create, error: null, finishedAt: null, status: "pending", workflowId: null });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchLoopsTask = async (ctx: MutationCtx, id: Id<"loopsTasks">, patch: Partial<LoopsTasks["CommonFields"]>) => {
  await ctx.db.patch("loopsTasks", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markLoopsTaskFailed = async (ctx: MutationCtx, id: Id<"loopsTasks">, { error, now }: WithNow<{ error: string }>) => {
  await patchLoopsTask(ctx, id, { error, finishedAt: now, status: "failed" });
};

export const markLoopsTaskSucceeded = async (ctx: MutationCtx, id: Id<"loopsTasks">, { now }: WithNow) => {
  await patchLoopsTask(ctx, id, { error: null, finishedAt: now, status: "succeeded" });
};

// ENQUEUE ---------------------------------------------------------------------------------------------------------------------------------
const enqueueLoopsTask = async (ctx: MutationCtx, payload: LoopsTasks["Create"]) => {
  const loopsTaskId = await createLoopsTask(ctx, payload);
  const workflowId = await start(ctx, internal.loops.run, { loopsTaskId });
  await patchLoopsTask(ctx, loopsTaskId, { workflowId });
  return workflowId;
};

export const enqueueSendConfirmationEmail = async (ctx: MutationCtx, payload: EnqueueSendConfirmationEmailOpts) =>
  await enqueueLoopsTask(ctx, { ...payload, idempotencyKey: payload.newsConfirmationId, kind: "sendConfirmationEmail" });
type EnqueueSendConfirmationEmailOpts = Omit<LoopsTasks["SendConfirmationEmailCreate"], "idempotencyKey" | "kind">;

export const enqueueSendEbookEmail = async (ctx: MutationCtx, payload: Omit<LoopsTasks["SendEbookEmailCreate"], "kind">) =>
  await enqueueLoopsTask(ctx, { ...payload, kind: "sendEbookEmail" });

const enqueueSyncContact = async (ctx: MutationCtx, payload: Omit<LoopsTasks["SyncContactCreate"], "kind">) =>
  await enqueueLoopsTask(ctx, { ...payload, kind: "syncContact" });

export const enqueueSyncContactForReactivation = async (ctx: MutationCtx, { confirmation, profileId }: ForReactivationOpts) =>
  await enqueueSyncContact(ctx, {
    idempotencyKey: `news-contact-reactivation:${confirmation.restrictionId}:${confirmation.restrictionVersion}`,
    profileId,
    subscribed: true,
  });
type ForReactivationOpts = { confirmation: NewsConfirmations["ReactivationDoc"]; profileId: Id<"profiles"> };

export const enqueueSyncContactForSubscription = async (ctx: MutationCtx, { profileId, subscriptionId }: ForSubscriptionOpts) =>
  await enqueueSyncContact(ctx, { idempotencyKey: `news-contact-subscription:${subscriptionId}`, profileId, subscribed: true });
type ForSubscriptionOpts = { profileId: Id<"profiles">; subscriptionId: Id<"newsSubscriptions"> };

export const enqueueSyncContactForUnsubscription = async (ctx: MutationCtx, { profileId, webhookId }: ForUnsubscriptionOpts) =>
  await enqueueSyncContact(ctx, { idempotencyKey: `loops-webhook-contact-unsubscription:${webhookId}`, profileId, subscribed: false });
type ForUnsubscriptionOpts = { profileId: Id<"profiles">; webhookId: Id<"loopsWebhooks"> };
