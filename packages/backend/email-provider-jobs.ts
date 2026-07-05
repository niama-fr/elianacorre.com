import { EMAIL_CLAIM_LEASE_MS } from "@ec/domain/helpers/email-provider-jobs";
import type { EmailProviderJobs } from "@ec/domain/schemas/email-provider-jobs";
import type { WithNow } from "@ec/domain/schemas/utils";
import { ConvexError } from "convex/values";

import { internal } from "./convex/_generated/api";
import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEmailProviderJob = async (ctx: QueryCtx, id: Id<"emailProviderJobs">) => await ctx.db.get("emailProviderJobs", id);

export const getSendingEmailProviderJobAttempt = async (
  ctx: QueryCtx,
  { attempt, id }: { attempt: number; id: Id<"emailProviderJobs"> }
) => {
  const doc = await getEmailProviderJob(ctx, id);
  return doc?.status === "sending" && doc.attempts === attempt ? doc : null;
};

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireEmailProviderJob = async (ctx: QueryCtx, id: Id<"emailProviderJobs">) => {
  const doc = await getEmailProviderJob(ctx, id);
  if (!doc) throw new ConvexError("UNKNOWN_EMAIL_PROVIDER_JOB");
  return doc;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const createEmailProviderJob = async (ctx: MutationCtx, create: EmailProviderJobs["Create"]) =>
  await ctx.db.insert("emailProviderJobs", {
    ...create,
    attempts: 0,
    lastError: null,
    leaseExpiresAt: null,
    sentAt: null,
    status: "pending",
  });

type TransactionalJobCreate = Omit<Extract<EmailProviderJobs["Create"], { kind: "confirmation" | "ebook" }>, "kind">;

export const createConfirmationEmailProviderJob = async (ctx: MutationCtx, create: TransactionalJobCreate) =>
  await createEmailProviderJob(ctx, { ...create, kind: "confirmation" });

export const createEbookEmailProviderJob = async (ctx: MutationCtx, create: TransactionalJobCreate) =>
  await createEmailProviderJob(ctx, { ...create, kind: "ebook" });

export const createNewsletterContactSyncJob = async (
  ctx: MutationCtx,
  create: Omit<Extract<EmailProviderJobs["Create"], { kind: "newsletter-contact-sync" }>, "kind">
) => await createEmailProviderJob(ctx, { ...create, kind: "newsletter-contact-sync" });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchEmailProviderJob = async (
  ctx: MutationCtx,
  id: Id<"emailProviderJobs">,
  patch: Partial<EmailProviderJobs["OperationalFields"]>
) => {
  await ctx.db.patch("emailProviderJobs", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markEmailProviderJobFailed = async (ctx: MutationCtx, id: Id<"emailProviderJobs">, { error }: { error: string }) => {
  await patchEmailProviderJob(ctx, id, { lastError: error, leaseExpiresAt: null, status: "failed" });
};

export const markEmailProviderJobPending = async (
  ctx: MutationCtx,
  id: Id<"emailProviderJobs">,
  { error, nextAttemptAt }: MarkPendingOpts
) => {
  await patchEmailProviderJob(ctx, id, { lastError: error, leaseExpiresAt: null, nextAttemptAt, status: "pending" });
};
type MarkPendingOpts = { error: string; nextAttemptAt: number };

export const markEmailProviderJobSending = async (
  ctx: MutationCtx,
  id: Id<"emailProviderJobs">,
  { attempts, now }: WithNow<{ attempts: number }>
) => {
  await patchEmailProviderJob(ctx, id, { attempts, leaseExpiresAt: now + EMAIL_CLAIM_LEASE_MS, status: "sending" });
};

export const markEmailProviderJobSent = async (ctx: MutationCtx, id: Id<"emailProviderJobs">, { now }: WithNow) => {
  await patchEmailProviderJob(ctx, id, { lastError: null, leaseExpiresAt: null, sentAt: now, status: "sent" });
};

// SCHEDULER -------------------------------------------------------------------------------------------------------------------------------
export const scheduleEmailProviderJobRunner = async (
  ctx: MutationCtx,
  id: Id<"emailProviderJobs">,
  { delayMs = 0 }: { delayMs?: number } = {}
) => {
  await ctx.scheduler.runAfter(Math.max(0, delayMs), internal.emailProviderRunner.run, { emailProviderJobId: id });
};
