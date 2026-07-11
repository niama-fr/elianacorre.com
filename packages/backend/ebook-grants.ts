import { createCapabilityToken, verifyCapabilityToken } from "@ec/domain/helpers/utils";
import type { EbookDownloads } from "@ec/domain/schemas/ebook-downloads";
import type { EbookGrants } from "@ec/domain/schemas/ebook-grants";
import { zid } from "convex-helpers/server/zod4";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";
import { getPublishedEbook } from "./ebooks";
import { enqueueSendEbookEmail } from "./loops-tasks";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const EBOOK_DOWNLOAD_TTL_MS = 72 * 60 * 60 * 1000;

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEbookGrant = async (ctx: QueryCtx, profileId: Id<"profiles">) =>
  await ctx.db
    .query("ebookGrants")
    .withIndex("by_profile_id", (query) => query.eq("profileId", profileId))
    .unique();

export const getValidEbookDownload = async (ctx: QueryCtx, { now, secret, token }: { now: number; secret: string; token: string }) => {
  const capabilityId = await verifyCapabilityToken({ secret, token });
  const parsedId = zid("ebookDownloads").safeParse(capabilityId);
  if (!parsedId.success) return null;

  const download = await ctx.db.get("ebookDownloads", parsedId.data);
  if (!download || download.expiresAt <= now) return null;
  const issuance = await ctx.db.get("ebookIssuances", download.ebookIssuanceId);
  if (!issuance) return null;
  const grant = await getEbookGrant(ctx, issuance.profileId);
  return grant ? { download, issuance } : null;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const createEbookGrant = async (ctx: MutationCtx, create: EbookGrants["Create"]) => await ctx.db.insert("ebookGrants", create);

const createEbookIssuance = async (ctx: MutationCtx, profileId: Id<"profiles">, ebookId: Id<"ebooks">, kind: "initial" | "replacement") =>
  await ctx.db.insert("ebookIssuances", { ebookId, kind, profileId });

const createEbookDownload = async (ctx: MutationCtx, create: EbookDownloads["Create"]) => await ctx.db.insert("ebookDownloads", create);

// BUSINESS --------------------------------------------------------------------------------------------------------------------------------
export const fulfillEbookRequest = async (
  ctx: MutationCtx,
  {
    kind,
    now,
    profileId,
    secret,
    sendEmail,
  }: { kind: "initial" | "replacement"; now: number; profileId: Id<"profiles">; secret: string; sendEmail: boolean }
) => {
  const ebook = await getPublishedEbook(ctx);
  if (!ebook) return null;

  const existingGrant = await getEbookGrant(ctx, profileId);
  if (!existingGrant) await createEbookGrant(ctx, { profileId });

  const ebookIssuanceId = await createEbookIssuance(ctx, profileId, ebook._id, kind);
  const ebookDownloadId = await createEbookDownload(ctx, { ebookIssuanceId, expiresAt: now + EBOOK_DOWNLOAD_TTL_MS });
  if (sendEmail)
    await enqueueSendEbookEmail(ctx, {
      ebookDownloadId,
      idempotencyKey: `ebook:${ebookIssuanceId}`,
      profileId,
    });

  return await createCapabilityToken({ capabilityId: ebookDownloadId, secret });
};
