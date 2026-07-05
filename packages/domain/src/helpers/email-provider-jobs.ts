import type { EmailProviderJobs } from "../schemas/email-provider-jobs";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const EMAIL_MAX_ATTEMPTS = 8;
export const EMAIL_RETRY_BASE_MS = 60 * 1000;
export const EMAIL_RETRY_MAX_MS = 60 * 60 * 1000;
export const EMAIL_CLAIM_LEASE_MS = 5 * 60 * 1000;

// RETRIES ---------------------------------------------------------------------------------------------------------------------------------
export const getRetryDelay = (attempts: number) => Math.min(EMAIL_RETRY_BASE_MS * 2 ** (attempts - 1), EMAIL_RETRY_MAX_MS);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const isEmailProviderJobSendingLeaseExpired = ({ leaseExpiresAt, status }: EmailProviderJobs["Doc"], now: number) =>
  status === "sending" && leaseExpiresAt !== null && leaseExpiresAt <= now;

export const shouldFailEmailProviderJobWithExpiredLease = (doc: EmailProviderJobs["Doc"], now: number) =>
  isEmailProviderJobSendingLeaseExpired(doc, now) && doc.attempts >= EMAIL_MAX_ATTEMPTS;

export const isEmailProviderJobReadyToRun = ({ nextAttemptAt, status }: EmailProviderJobs["Doc"], now: number) =>
  status === "pending" && nextAttemptAt <= now;
