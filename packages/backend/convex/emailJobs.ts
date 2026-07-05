import {
  EMAIL_CLAIM_LEASE_MS,
  EMAIL_MAX_ATTEMPTS,
  getRetryDelay,
  isEmailJobReadyToSend,
  isEmailJobSendingLeaseExpired,
  shouldFailEmailJobWithExpiredLease,
} from "@ec/domain/helpers/email-jobs";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import {
  getSendingEmailJobAttempt,
  getEmailJob,
  markEmailJobFailed,
  markEmailJobPending,
  markEmailJobSending,
  markEmailJobSent,
  requireEmailJob,
  scheduleEmailJobRunner,
} from "../email-jobs";
import { getProfile } from "../profiles";
import { zInternalMutation } from "./zod";

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const claim = zInternalMutation({
  args: { emailJobId: zid("emailJobs") },
  handler: async (ctx, { emailJobId }) => {
    const now = Date.now();
    const job = await getEmailJob(ctx, emailJobId);
    if (!job) return null;
    const isSendingLeaseExpired = isEmailJobSendingLeaseExpired(job, now);
    if (!isEmailJobReadyToSend(job, now) && !isSendingLeaseExpired) return null;
    if (shouldFailEmailJobWithExpiredLease(job, now)) {
      await markEmailJobFailed(ctx, emailJobId, { error: "Email delivery lease expired after maximum attempts" });
      return null;
    }
    const profile = await getProfile(ctx, job.profileId);
    if (!profile) {
      await markEmailJobFailed(ctx, emailJobId, { error: "Newsletter profile was not found" });
      return null;
    }
    const attempts = job.attempts + 1;
    await markEmailJobSending(ctx, emailJobId, { attempts, now });
    await scheduleEmailJobRunner(ctx, emailJobId, { delayMs: EMAIL_CLAIM_LEASE_MS });
    return { job: await requireEmailJob(ctx, emailJobId), profile };
  },
});

export const recordSendFailure = zInternalMutation({
  args: { attempt: z.int().positive(), emailJobId: zid("emailJobs"), error: z.string() },
  handler: async (ctx, { attempt, emailJobId, error }) => {
    const doc = await getSendingEmailJobAttempt(ctx, { attempt, id: emailJobId });
    if (!doc) return;

    const now = Date.now();

    if (doc.attempts >= EMAIL_MAX_ATTEMPTS) {
      await markEmailJobFailed(ctx, emailJobId, { error });
      return;
    }

    const retryDelay = getRetryDelay(doc.attempts);
    await markEmailJobPending(ctx, emailJobId, { error, nextAttemptAt: now + retryDelay });
    await scheduleEmailJobRunner(ctx, emailJobId, { delayMs: retryDelay });
  },
});

export const recordSendSuccess = zInternalMutation({
  args: { attempt: z.int().positive(), emailJobId: zid("emailJobs") },
  handler: async (ctx, { attempt, emailJobId }) => {
    const doc = await getSendingEmailJobAttempt(ctx, { attempt, id: emailJobId });
    if (doc) await markEmailJobSent(ctx, emailJobId, { now: Date.now() });
  },
});
