import { EMAIL_CLAIM_LEASE_MS } from "@ec/domain/helpers/email-jobs";
import type { EmailJobs } from "@ec/domain/schemas/email-jobs";
import type { WithNow } from "@ec/domain/schemas/utils";
import { ConvexError } from "convex/values";

import { internal } from "./convex/_generated/api";
import type { Id } from "./convex/_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./convex/_generated/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getEmailJob = async (ctx: QueryCtx, id: Id<"emailJobs">) => await ctx.db.get("emailJobs", id);

export const getSendingEmailJobAttempt = async (ctx: QueryCtx, { attempt, id }: { attempt: number; id: Id<"emailJobs"> }) => {
  const doc = await getEmailJob(ctx, id);
  return doc?.status === "sending" && doc.attempts === attempt ? doc : null;
};

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireEmailJob = async (ctx: QueryCtx, id: Id<"emailJobs">) => {
  const doc = await getEmailJob(ctx, id);
  if (!doc) throw new ConvexError("UNKNOWN_EMAIL_JOB");
  return doc;
};

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
const createEmailJob = async (ctx: MutationCtx, create: EmailJobs["Create"]) =>
  await ctx.db.insert("emailJobs", {
    ...create,
    attempts: 0,
    lastError: null,
    leaseExpiresAt: null,
    sentAt: null,
    status: "pending",
  });

export const createConfirmationEmailJob = async (ctx: MutationCtx, create: Omit<EmailJobs["Create"], "kind">) =>
  await createEmailJob(ctx, { ...create, kind: "confirmation" });

export const createEbookEmailJob = async (ctx: MutationCtx, create: Omit<EmailJobs["Create"], "kind">) =>
  await createEmailJob(ctx, { ...create, kind: "ebook" });

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const patchEmailJob = async (ctx: MutationCtx, id: Id<"emailJobs">, patch: Partial<EmailJobs["Fields"]>) => {
  await ctx.db.patch("emailJobs", id, patch);
};

// MARK ------------------------------------------------------------------------------------------------------------------------------------
export const markEmailJobFailed = async (ctx: MutationCtx, id: Id<"emailJobs">, { error }: { error: string }) => {
  await patchEmailJob(ctx, id, { lastError: error, leaseExpiresAt: null, status: "failed" });
};

export const markEmailJobPending = async (ctx: MutationCtx, id: Id<"emailJobs">, { error, nextAttemptAt }: MarkPendingOpts) => {
  await patchEmailJob(ctx, id, { lastError: error, leaseExpiresAt: null, nextAttemptAt, status: "pending" });
};
type MarkPendingOpts = { error: string; nextAttemptAt: number };

export const markEmailJobSending = async (ctx: MutationCtx, id: Id<"emailJobs">, { attempts, now }: WithNow<{ attempts: number }>) => {
  await patchEmailJob(ctx, id, { attempts, leaseExpiresAt: now + EMAIL_CLAIM_LEASE_MS, status: "sending" });
};

export const markEmailJobSent = async (ctx: MutationCtx, id: Id<"emailJobs">, { now }: WithNow) => {
  await patchEmailJob(ctx, id, { lastError: null, leaseExpiresAt: null, sentAt: now, status: "sent" });
};

// SCHEDULER -------------------------------------------------------------------------------------------------------------------------------
export const scheduleEmailJobRunner = async (ctx: MutationCtx, id: Id<"emailJobs">, { delayMs = 0 }: { delayMs?: number } = {}) => {
  await ctx.scheduler.runAfter(Math.max(0, delayMs), internal.emailRunner.send, { emailJobId: id });
};
