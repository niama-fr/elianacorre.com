import {
  EMAIL_CLAIM_LEASE_MS,
  EMAIL_MAX_ATTEMPTS,
  getRetryDelay,
  isEmailProviderJobReadyToRun,
  isEmailProviderJobSendingLeaseExpired,
  shouldFailEmailProviderJobWithExpiredLease,
} from "@ec/domain/helpers/email-provider-jobs";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import {
  getSendingEmailProviderJobAttempt,
  getEmailProviderJob,
  markEmailProviderJobFailed,
  markEmailProviderJobPending,
  markEmailProviderJobSending,
  markEmailProviderJobSent,
  requireEmailProviderJob,
  scheduleEmailProviderJobRunner,
} from "../email-provider-jobs";
import { getProfile } from "../profiles";
import { zInternalMutation } from "./zod";

// INTERNAL MUTATIONS ----------------------------------------------------------------------------------------------------------------------
export const claim = zInternalMutation({
  args: { emailProviderJobId: zid("emailProviderJobs") },
  handler: async (ctx, { emailProviderJobId }) => {
    const now = Date.now();
    const job = await getEmailProviderJob(ctx, emailProviderJobId);
    if (!job) return null;
    const isSendingLeaseExpired = isEmailProviderJobSendingLeaseExpired(job, now);
    if (!isEmailProviderJobReadyToRun(job, now) && !isSendingLeaseExpired) return null;
    if (shouldFailEmailProviderJobWithExpiredLease(job, now)) {
      await markEmailProviderJobFailed(ctx, emailProviderJobId, { error: "Email provider job lease expired after maximum attempts" });
      return null;
    }
    const profile = await getProfile(ctx, job.profileId);
    if (!profile) {
      await markEmailProviderJobFailed(ctx, emailProviderJobId, { error: "Profile was not found" });
      return null;
    }
    const attempts = job.attempts + 1;
    await markEmailProviderJobSending(ctx, emailProviderJobId, { attempts, now });
    await scheduleEmailProviderJobRunner(ctx, emailProviderJobId, { delayMs: EMAIL_CLAIM_LEASE_MS });
    return { job: await requireEmailProviderJob(ctx, emailProviderJobId), profile };
  },
});

export const recordSendFailure = zInternalMutation({
  args: { attempt: z.int().positive(), emailProviderJobId: zid("emailProviderJobs"), error: z.string() },
  handler: async (ctx, { attempt, emailProviderJobId, error }) => {
    const doc = await getSendingEmailProviderJobAttempt(ctx, { attempt, id: emailProviderJobId });
    if (!doc) return;

    const now = Date.now();

    if (doc.attempts >= EMAIL_MAX_ATTEMPTS) {
      await markEmailProviderJobFailed(ctx, emailProviderJobId, { error });
      return;
    }

    const retryDelay = getRetryDelay(doc.attempts);
    await markEmailProviderJobPending(ctx, emailProviderJobId, { error, nextAttemptAt: now + retryDelay });
    await scheduleEmailProviderJobRunner(ctx, emailProviderJobId, { delayMs: retryDelay });
  },
});

export const recordSendSuccess = zInternalMutation({
  args: { attempt: z.int().positive(), emailProviderJobId: zid("emailProviderJobs") },
  handler: async (ctx, { attempt, emailProviderJobId }) => {
    const doc = await getSendingEmailProviderJobAttempt(ctx, { attempt, id: emailProviderJobId });
    if (doc) await markEmailProviderJobSent(ctx, emailProviderJobId, { now: Date.now() });
  },
});
