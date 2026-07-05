import { createHashedToken } from "@ec/domain/helpers/utils";
import type { EbookGrants } from "@ec/domain/schemas/ebook-grants";
import type { WithNow } from "@ec/domain/schemas/utils";

import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";
import { getPublishedEbook } from "./ebooks";
import { createEbookEmailJob, scheduleEmailJobRunner } from "./email-jobs";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const DOWNLOAD_TTL_MS = 72 * 60 * 60 * 1000;

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getValidEbookGrant = async (ctx: QueryCtx, { now, tokenHash }: WithNow<{ tokenHash: string }>) => {
  const doc = await ctx.db
    .query("ebookGrants")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  return doc && doc.issuedAt + DOWNLOAD_TTL_MS > now ? doc : null;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createEbookGrant = async (ctx: MutationCtx, payload: EbookGrants["Create"]) => await ctx.db.insert("ebookGrants", payload);

// BUSINESS --------------------------------------------------------------------------------------------------------------------------------
export const fulfillEbookRequest = async (ctx: MutationCtx, { now, profileId }: WithNow<{ profileId: Id<"profiles"> }>) => {
  const ebook = await getPublishedEbook(ctx);
  if (!ebook) return null;

  const { token: linkToken, tokenHash } = await createHashedToken();
  const ebookGrantId = await createEbookGrant(ctx, { issuedAt: now, profileId, tokenHash });
  const emailJobId = await createEbookEmailJob(ctx, { idempotencyKey: `ebook:${ebookGrantId}`, linkToken, nextAttemptAt: now, profileId });
  await scheduleEmailJobRunner(ctx, emailJobId);
  return linkToken;
};
