import RateLimiter, { MINUTE } from "@convex-dev/rate-limiter";
import type { AdminMutationCtx } from "@ec/backend/convex/zod";
import { env, type MutationCtx, type QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import { createCapabilityToken, verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import type { EbookIssuances } from "@ec/domain/schemas/ebook-issuances";
import type { WithNow } from "@ec/domain/schemas/utils";

import { components } from "../convex/_generated/api";
import { createEbookDownload, getEbookDownload } from "../data/ebook-downloads";
import { createEbookIssuance, getEbookIssuance, getLatestEbookIssuance } from "../data/ebook-issuances";
import { getPublishedEbook, listPublishedEbooks, markEbookArchived, markEbookPublished, requireEbook } from "../data/ebooks";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import { getLatestConfirmedNewsSubscription } from "../data/news-subscriptions";
import { getNewsSuppressionByEmail } from "../data/news-suppressions";
import { getProfile, getProfileIdByEmail } from "../data/profiles";
import { enqueueSendEbookEmail } from "./loops";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const DOWNLOAD_TTL_MS = 72 * 60 * 60 * 1000;
const FORMER_NEWSLETTER_SUBSCRIBER_RETENTION_MS = 3 * 365 * 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 15 * MINUTE;

const rateLimiter = new RateLimiter(components.rateLimiter, {
  ebookRecoveryByEmail: { kind: "fixed window", period: RATE_LIMIT_WINDOW_MS, rate: 3 },
  ebookRecoveryByIp: { kind: "fixed window", period: RATE_LIMIT_WINDOW_MS, rate: 3 },
});

// ISSUE DOWNLOAD --------------------------------------------------------------------------------------------------------------------------
export async function issueInitialEbookDownload(ctx: MutationCtx, opts: Omit<IssueDownloadOpts, "kind">) {
  return await issueDownload(ctx, { ...opts, kind: "initial" });
}

export async function issueReplacementEbookDownload(ctx: MutationCtx, opts: Omit<IssueDownloadOpts, "kind">) {
  return await issueDownload(ctx, { ...opts, kind: "replacement" });
}

// PUBLISH ---------------------------------------------------------------------------------------------------------------------------------
export async function publishEbook(ctx: AdminMutationCtx, id: Id<"ebooks">, { now }: WithNow) {
  const doc = await requireEbook(ctx, id);
  if (doc.status === "published") return id;

  const publishedEbooks = await listPublishedEbooks(ctx);

  await Promise.all(
    publishedEbooks.map(async ({ _id: publishedEbookId }) => {
      await markEbookArchived(ctx, publishedEbookId, { now });
    })
  );

  await markEbookPublished(ctx, id, { now });
  return id;
}

// REQUEST RECOVERY ------------------------------------------------------------------------------------------------------------------------
export async function requestEbookRecovery(ctx: MutationCtx, { email, now, requestIp, website }: RequestRecoveryOpts) {
  if (website !== "") return;
  if (!(await tryConsumeRecoveryRateLimit(ctx, { email, requestIp }))) return;
  if (await getNewsSuppressionByEmail(ctx, email)) return;

  const profileId = await getProfileIdByEmail(ctx, email);
  if (!profileId || (await getActiveNewsRestriction(ctx, profileId)) || !(await hasAccess(ctx, { now, profileId }))) return;

  await issueReplacementEbookDownload(ctx, { profileId, sendEmail: true });
}
type RequestRecoveryOpts = WithNow<{ email: string; requestIp: string; website: string }>;

// RESOLVE ISSUANCE ------------------------------------------------------------------------------------------------------------------------
export async function resolveEbookIssuanceFromToken(ctx: QueryCtx, { now, token }: WithNow<{ token: string }>) {
  const capabilityId = await verifyCapabilityToken({ secret: env.CAPABILITY_SIGNING_SECRET, token });
  const downloadId = capabilityId ? ctx.db.normalizeId("ebookDownloads", capabilityId) : null;
  if (!downloadId) return null;

  const download = await getEbookDownload(ctx, downloadId);
  if (!download || download._creationTime + DOWNLOAD_TTL_MS <= now) return null;

  const issuance = await getEbookIssuance(ctx, download.ebookIssuanceId);
  if (!issuance || !(await hasAccess(ctx, { now, profileId: issuance.profileId }))) return null;
  return issuance;
}

// INTERNAL -------------------------------------------------------------------------------------------------------------------------------
async function hasAccess(ctx: QueryCtx, { now, profileId }: WithNow<{ profileId: Id<"profiles"> }>) {
  const [profile, subscription, issuance] = await Promise.all([
    getProfile(ctx, profileId),
    getLatestConfirmedNewsSubscription(ctx, profileId),
    getLatestEbookIssuance(ctx, profileId),
  ]);
  if (!profile || !subscription) return false;
  if (subscription.unsubscribedAt === null) return true;

  const lastRelevantContactAt = Math.max(subscription.unsubscribedAt, issuance?._creationTime ?? 0);
  return now < lastRelevantContactAt + FORMER_NEWSLETTER_SUBSCRIBER_RETENTION_MS;
}

async function issueDownload(ctx: MutationCtx, { kind, profileId, sendEmail }: IssueDownloadOpts) {
  const ebook = await getPublishedEbook(ctx);
  if (!ebook) return null;

  const ebookIssuanceId = await createEbookIssuance(ctx, { ebookId: ebook._id, kind, profileId });
  const ebookDownloadId = await createEbookDownload(ctx, { ebookIssuanceId });
  if (sendEmail) await enqueueSendEbookEmail(ctx, { ebookDownloadId, idempotencyKey: `ebook:${ebookIssuanceId}`, profileId });

  return await createCapabilityToken({ capabilityId: ebookDownloadId, secret: env.CAPABILITY_SIGNING_SECRET });
}
type IssueDownloadOpts = { kind: EbookIssuances["Kind"]; profileId: Id<"profiles">; sendEmail: boolean };

async function tryConsumeRecoveryRateLimit(ctx: MutationCtx, { email, requestIp }: { email: string; requestIp: string }) {
  const [emailLimit, ipLimit] = await Promise.all([
    rateLimiter.limit(ctx, "ebookRecoveryByEmail", { key: email }),
    rateLimiter.limit(ctx, "ebookRecoveryByIp", { key: requestIp }),
  ]);
  return emailLimit.ok && ipLimit.ok;
}
