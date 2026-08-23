import RateLimiter, { MINUTE } from "@convex-dev/rate-limiter";
import type { Id } from "@ec/backend/types";
import { createCapabilityToken, verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import type { EbookIssuances } from "@ec/domain/schemas/ebook-issuances";
import type { WithNow } from "@ec/domain/schemas/utils";
import { Effect as E, Option as O } from "effect";

import { components } from "../confect/_generated/components";
import type { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { MutationCtx, QueryCtx } from "../confect/_generated/services";
import { env } from "../convex/_generated/server";
import { createEbookDownload, getEbookDownload } from "../data/ebook-downloads";
import { createEbookIssuance, getEbookIssuance, getLatestEbookIssuance } from "../data/ebook-issuances";
import { getPublishedEbook, listPublishedEbooks, markEbookArchived, markEbookPublished, requireEbook } from "../data/ebooks";
import { getActiveNewsRestriction } from "../data/news-restrictions";
import { getLatestConfirmedNewsSubscription } from "../data/news-subscriptions";
import { getNewsSuppressionByEmail } from "../data/news-suppressions";
import { getProfile, getProfileIdByEmail } from "../data/profiles";
import { CurrentAdmin } from "../runtime/current-profile";
import { enqueueSendEbookEmail } from "./loops";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const DOWNLOAD_TTL_MS = 72 * 60 * 60 * 1000;
const FORMER_NEWSLETTER_SUBSCRIBER_RETENTION_YEARS = 3;
const RATE_LIMIT_WINDOW_MS = 15 * MINUTE;

const rateLimiter = new RateLimiter(components.rateLimiter, {
  ebookRecoveryByEmail: {
    kind: "fixed window",
    period: RATE_LIMIT_WINDOW_MS,
    rate: 3,
  },
  ebookRecoveryByIp: {
    kind: "fixed window",
    period: RATE_LIMIT_WINDOW_MS,
    rate: 3,
  },
});

// ISSUE DOWNLOAD --------------------------------------------------------------------------------------------------------------------------
export const issueInitialEbookDownload = E.fn(function* (opts: Omit<IssueDownloadOpts, "kind">) {
  return yield* issueDownload({ ...opts, kind: "initial" });
});

export const issueReplacementEbookDownload = E.fn(function* (opts: Omit<IssueDownloadOpts, "kind">) {
  return yield* issueDownload({ ...opts, kind: "replacement" });
});

// PUBLISH ---------------------------------------------------------------------------------------------------------------------------------
export const publishEbook = E.fn(function* (id: Id<"ebooks">, { now }: WithNow) {
  const admin = yield* CurrentAdmin;
  const ebook = yield* requireEbook(id);

  if (ebook.status === "published") return id;

  const publishedEbooks = yield* listPublishedEbooks();

  for (const { _id: publishedEbookId } of publishedEbooks) yield* markEbookArchived(publishedEbookId, { now });

  yield* markEbookPublished(id, { now, publishedBy: admin._id });

  return id;
});

// REQUEST RECOVERY ------------------------------------------------------------------------------------------------------------------------
export const requestEbookRecovery = E.fn(function* ({ email, now, requestIp, website }: RequestRecoveryOpts) {
  if (website !== "") return;

  const withinRateLimit = yield* tryConsumeRecoveryRateLimit({ email, requestIp });

  if (!withinRateLimit) return;

  const suppression = yield* getNewsSuppressionByEmail(email);

  if (O.isSome(suppression)) return;

  const profileId = yield* getProfileIdByEmail(email);

  if (O.isNone(profileId)) return;

  const restriction = yield* getActiveNewsRestriction(profileId.value);

  if (O.isSome(restriction)) return;

  const access = yield* hasAccess({ now, profileId: profileId.value });

  if (!access) return;

  yield* issueReplacementEbookDownload({ profileId: profileId.value, sendEmail: true });
});
type RequestRecoveryOpts = WithNow<{ email: string; requestIp: string; website: string }>;

// RESOLVE ISSUANCE ------------------------------------------------------------------------------------------------------------------------
export const resolveEbookIssuanceFromToken = E.fn(function* ({ now, token }: WithNow<{ token: string }>) {
  const ctx = yield* QueryCtx;

  const capabilityId = yield* verifyCapabilityToken({ secret: env.CAPABILITY_SIGNING_SECRET, token });

  if (O.isNone(capabilityId)) return null;

  const downloadId = ctx.db.normalizeId("ebookDownloads", capabilityId.value);

  if (downloadId === null) return null;

  const download = yield* getEbookDownload(downloadId);

  if (O.isNone(download)) return null;

  if (download.value._creationTime + DOWNLOAD_TTL_MS <= now) return null;

  const issuance = yield* getEbookIssuance(download.value.ebookIssuanceId);

  if (O.isNone(issuance)) return null;

  const access = yield* hasAccess({ now, profileId: issuance.value.profileId });

  if (!access) return null;

  return issuance.value;
});

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
const hasAccess = E.fn(function* ({ now, profileId }: WithNow<{ profileId: Id<"profiles"> }>) {
  const profile = yield* getProfile(profileId);
  const subscription = yield* getLatestConfirmedNewsSubscription(profileId);
  const issuance = yield* getLatestEbookIssuance(profileId);

  if (O.isNone(profile) || O.isNone(subscription)) return false;

  if (subscription.value.unsubscribedAt === null) return true;

  const issuanceAt = O.isSome(issuance) ? issuance.value._creationTime : 0;

  const lastRelevantContactAt = Math.max(subscription.value.unsubscribedAt, issuanceAt);

  return now < addCalendarYears(lastRelevantContactAt, FORMER_NEWSLETTER_SUBSCRIBER_RETENTION_YEARS);
});

function addCalendarYears(timestamp: number, years: number) {
  const anniversary = new Date(timestamp);
  const originalMonth = anniversary.getUTCMonth();

  anniversary.setUTCFullYear(anniversary.getUTCFullYear() + years);

  if (anniversary.getUTCMonth() !== originalMonth) anniversary.setUTCDate(0);

  return anniversary.getTime();
}

const issueDownload = E.fn(function* ({
  kind,
  profileId,
  sendEmail,
}: IssueDownloadOpts): E.fn.Return<O.Option<string>, never, MutationCtx | DatabaseWriter | DatabaseReader> {
  const ebook = yield* getPublishedEbook();

  if (O.isNone(ebook)) return O.none();

  const ebookIssuanceId = yield* createEbookIssuance({ ebookId: ebook.value._id, kind, profileId });
  const ebookDownloadId = yield* createEbookDownload({ ebookIssuanceId });

  if (sendEmail) yield* enqueueSendEbookEmail({ ebookDownloadId, idempotencyKey: `ebook:${ebookIssuanceId}`, profileId });

  return O.some(yield* createCapabilityToken({ capabilityId: ebookDownloadId, secret: env.CAPABILITY_SIGNING_SECRET }));
});

type IssueDownloadOpts = { kind: EbookIssuances["Kind"]; profileId: Id<"profiles">; sendEmail: boolean };

const tryConsumeRecoveryRateLimit = E.fn(function* ({ email, requestIp }: { email: string; requestIp: string }) {
  const ctx = yield* MutationCtx;

  const emailLimit = yield* E.promise(async () => await rateLimiter.limit(ctx, "ebookRecoveryByEmail", { key: email }));
  const ipLimit = yield* E.promise(async () => await rateLimiter.limit(ctx, "ebookRecoveryByIp", { key: requestIp }));

  return emailLimit.ok && ipLimit.ok;
});
