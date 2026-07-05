import type { EmailJobs } from "../schemas/email-jobs";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const EMAIL_MAX_ATTEMPTS = 8;
export const EMAIL_RETRY_BASE_MS = 60 * 1000;
export const EMAIL_RETRY_MAX_MS = 60 * 60 * 1000;
export const EMAIL_CLAIM_LEASE_MS = 5 * 60 * 1000;

// RETRIES ---------------------------------------------------------------------------------------------------------------------------------
export const getRetryDelay = (attempts: number) => Math.min(EMAIL_RETRY_BASE_MS * 2 ** (attempts - 1), EMAIL_RETRY_MAX_MS);

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const isEmailJobSendingLeaseExpired = ({ leaseExpiresAt, status }: EmailJobs["Doc"], now: number) =>
  status === "sending" && leaseExpiresAt !== null && leaseExpiresAt <= now;

export const shouldFailEmailJobWithExpiredLease = (doc: EmailJobs["Doc"], now: number) =>
  isEmailJobSendingLeaseExpired(doc, now) && doc.attempts >= EMAIL_MAX_ATTEMPTS;

export const isEmailJobReadyToSend = ({ nextAttemptAt, status }: EmailJobs["Doc"], now: number) =>
  status === "pending" && nextAttemptAt <= now;
