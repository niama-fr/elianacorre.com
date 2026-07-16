import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";

type PageOptions = { cursor: string | null; limit: number };

const requireBoundedRelations = (records: readonly unknown[], maxRelations: number) => {
  if (records.length > maxRelations) throw new Error("RETENTION_RELATION_LIMIT_EXCEEDED");
};

const anonymizeProfileData = async (
  ctx: MutationCtx,
  { anonymousEmail, maxRelations, profileId }: { anonymousEmail: string; maxRelations: number; profileId: Id<"profiles"> }
) => {
  const profile = await ctx.db.get(profileId);
  if (!profile) return;
  const webhooks = await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_email", (query) => query.eq("email", profile.email))
    .take(maxRelations + 1);
  requireBoundedRelations(webhooks, maxRelations);
  for (const webhook of webhooks) await ctx.db.patch(webhook._id, { email: anonymousEmail });
  await ctx.db.patch(profileId, { email: anonymousEmail, firstName: undefined, lastName: undefined });
};

export const paginateExpiredLoopsTasks = async (ctx: MutationCtx, { before, cursor, limit }: PageOptions & { before: number }) =>
  await ctx.db
    .query("loopsTasks")
    .withIndex("by_finished_at", (query) => query.lte("finishedAt", before))
    .paginate({ cursor, numItems: limit });

export const deleteLoopsTask = async (ctx: MutationCtx, taskId: Id<"loopsTasks">) => {
  await ctx.db.delete(taskId);
};

export const paginateExpiredLoopsWebhooks = async (ctx: MutationCtx, { before, cursor, limit }: PageOptions & { before: number }) =>
  await ctx.db
    .query("loopsWebhooks")
    .withIndex("by_occurred_at", (query) => query.lte("occurredAt", before))
    .paginate({ cursor, numItems: limit });

export const deleteLoopsWebhook = async (ctx: MutationCtx, webhookId: Id<"loopsWebhooks">) => {
  await ctx.db.delete(webhookId);
};

export const paginateExpiredEbookDownloads = async (ctx: MutationCtx, { before, cursor, limit }: PageOptions & { before: number }) =>
  await ctx.db
    .query("ebookDownloads")
    .withIndex("by_creation_time", (query) => query.lte("_creationTime", before))
    .paginate({ cursor, numItems: limit });

export const getLoopsTaskByEbookDownload = async (ctx: QueryCtx, downloadId: Id<"ebookDownloads">) =>
  await ctx.db
    .query("loopsTasks")
    .withIndex("by_ebook_download_id", (query) => query.eq("ebookDownloadId", downloadId))
    .unique();

export const deleteEbookDownload = async (ctx: MutationCtx, downloadId: Id<"ebookDownloads">) => {
  await ctx.db.delete(downloadId);
};

export const paginateRetentionProfiles = async (ctx: QueryCtx, { cursor, limit }: PageOptions) =>
  await ctx.db.query("profiles").paginate({ cursor, numItems: limit });

export const getProfileSubscriptionContext = async (ctx: QueryCtx, profileId: Id<"profiles">, limit: number) => {
  const [identity, subscriptions] = await Promise.all([
    ctx.db
      .query("identities")
      .withIndex("by_profile_id_and_adapter", (query) => query.eq("profileId", profileId))
      .first(),
    ctx.db
      .query("newsSubscriptions")
      .withIndex("by_profile_id_and_confirmed_at", (query) => query.eq("profileId", profileId))
      .take(limit),
  ]);
  return { hasSeparateRelationship: !!identity, subscriptions };
};

export const getFormerSubscriberActivity = async (ctx: QueryCtx, profileId: Id<"profiles">, limit: number) => {
  const [contactRequests, ebookIssuances] = await Promise.all([
    ctx.db
      .query("contactRequests")
      .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
      .take(limit),
    ctx.db
      .query("ebookIssuances")
      .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
      .take(limit),
  ]);
  return { contactRequests, ebookIssuances };
};

export const expirePendingProfileData = async (
  ctx: MutationCtx,
  options: {
    anonymousEmail: string;
    maxRelations: number;
    profileId: Id<"profiles">;
    shouldAnonymize: boolean;
    subscriptionIds: Id<"newsSubscriptions">[];
  }
) => {
  const { anonymousEmail, maxRelations, profileId, shouldAnonymize, subscriptionIds } = options;
  const tasks = await ctx.db
    .query("loopsTasks")
    .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
    .take(maxRelations + 1);
  requireBoundedRelations(tasks, maxRelations);
  const confirmationsBySubscription = await Promise.all(
    subscriptionIds.map(
      async (subscriptionId) =>
        await ctx.db
          .query("newsConfirmations")
          .withIndex("by_subscription_id", (query) => query.eq("subscriptionId", subscriptionId))
          .take(maxRelations + 1)
    )
  );
  for (const confirmations of confirmationsBySubscription) requireBoundedRelations(confirmations, maxRelations);
  for (const confirmations of confirmationsBySubscription)
    for (const confirmation of confirmations) {
      for (const task of tasks)
        if (task.kind === "sendConfirmationEmail" && task.newsConfirmationId === confirmation._id) await ctx.db.delete(task._id);
      await ctx.db.delete(confirmation._id);
    }

  if (shouldAnonymize) await anonymizeProfileData(ctx, { anonymousEmail, maxRelations, profileId });
};

export const expireFormerProfileData = async (
  ctx: MutationCtx,
  options: { anonymousEmail: string; maxRelations: number; profileId: Id<"profiles"> }
) => {
  const { anonymousEmail, maxRelations, profileId } = options;
  const [issuances, tasks] = await Promise.all([
    ctx.db
      .query("ebookIssuances")
      .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
      .take(maxRelations + 1),
    ctx.db
      .query("loopsTasks")
      .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
      .take(maxRelations + 1),
  ]);
  requireBoundedRelations(issuances, maxRelations);
  requireBoundedRelations(tasks, maxRelations);
  const downloadsByIssuance = await Promise.all(
    issuances.map(
      async (issuance) =>
        await ctx.db
          .query("ebookDownloads")
          .withIndex("by_ebook_issuance_id", (query) => query.eq("ebookIssuanceId", issuance._id))
          .take(maxRelations + 1)
    )
  );
  for (const downloads of downloadsByIssuance) requireBoundedRelations(downloads, maxRelations);
  for (const [issuanceIndex, issuance] of issuances.entries()) {
    const downloads = downloadsByIssuance[issuanceIndex] ?? [];
    for (const download of downloads) {
      for (const task of tasks) if (task.kind === "sendEbookEmail" && task.ebookDownloadId === download._id) await ctx.db.delete(task._id);
      await ctx.db.delete(download._id);
    }
    await ctx.db.delete(issuance._id);
  }
  await anonymizeProfileData(ctx, { anonymousEmail, maxRelations, profileId });
};

export const listProfilesForPortability = async (ctx: QueryCtx, limit: number) => await ctx.db.query("profiles").take(limit);

export const getProfilePortabilityContext = async (ctx: QueryCtx, profileId: Id<"profiles">, limit: number) => {
  const [issuances, subscriptions] = await Promise.all([
    ctx.db
      .query("ebookIssuances")
      .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
      .take(limit),
    ctx.db
      .query("newsSubscriptions")
      .withIndex("by_profile_id_and_confirmed_at", (query) => query.eq("profileId", profileId))
      .take(limit),
  ]);
  return { issuances, subscriptions };
};

export const listNewsSuppressionsForPortability = async (ctx: QueryCtx, limit: number) =>
  await ctx.db.query("newsSuppressions").take(limit);
