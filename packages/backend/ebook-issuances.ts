import { createCapabilityToken, verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import type { EbookIssuances } from "@ec/domain/schemas/ebook-issuances";
import type { WithNow } from "@ec/domain/schemas/utils";

import type { Id } from "./convex/_generated/dataModel";
import { env, type MutationCtx, type QueryCtx } from "./convex/_generated/server";
import { createEbookDownload, getEbookDownload } from "./ebook-downloads";
import { getPublishedEbook } from "./ebooks";
import { enqueueSendEbookEmail } from "./loops-tasks";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const EBOOK_DOWNLOAD_TTL_MS = 72 * 60 * 60 * 1000;

// GET ----------------------------------------------------------------------------------------------------------------------------------
export const getEbookIssuance = async (ctx: QueryCtx, id: Id<"ebookIssuances">) => await ctx.db.get("ebookIssuances", id);

export const getValidEbookIssuanceByToken = async (ctx: QueryCtx, { now, token }: WithNow<{ token: string }>) => {
  const capabilityId = await verifyCapabilityToken({ secret: env.CAPABILITY_SIGNING_SECRET, token });
  const downloadId = capabilityId ? ctx.db.normalizeId("ebookDownloads", capabilityId) : null;
  if (!downloadId) return null;

  const download = await getEbookDownload(ctx, downloadId);
  if (!download || download._creationTime + EBOOK_DOWNLOAD_TTL_MS <= now) return null;

  return await getEbookIssuance(ctx, download.ebookIssuanceId);
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookIssuance = async (ctx: MutationCtx, payload: EbookIssuances["Create"]) =>
  await ctx.db.insert("ebookIssuances", payload);

// BUSINESS --------------------------------------------------------------------------------------------------------------------------------
const issueEbookDownload = async (ctx: MutationCtx, { kind, profileId, sendEmail }: IssueEbookDownloadOpts) => {
  const ebook = await getPublishedEbook(ctx);
  if (!ebook) return null;

  const ebookIssuanceId = await createEbookIssuance(ctx, { ebookId: ebook._id, kind, profileId });
  const ebookDownloadId = await createEbookDownload(ctx, { ebookIssuanceId });
  if (sendEmail) await enqueueSendEbookEmail(ctx, { ebookDownloadId, idempotencyKey: `ebook:${ebookIssuanceId}`, profileId });

  return await createCapabilityToken({ capabilityId: ebookDownloadId, secret: env.CAPABILITY_SIGNING_SECRET });
};
type IssueEbookDownloadOpts = { kind: EbookIssuances["Kind"]; profileId: Id<"profiles">; sendEmail: boolean };

export const issueInitialEbookDownload = async (ctx: MutationCtx, opts: Omit<IssueEbookDownloadOpts, "kind">) =>
  await issueEbookDownload(ctx, { ...opts, kind: "initial" });

export const issueReplacementEbookDownload = async (ctx: MutationCtx, opts: Omit<IssueEbookDownloadOpts, "kind">) =>
  await issueEbookDownload(ctx, { ...opts, kind: "replacement" });
