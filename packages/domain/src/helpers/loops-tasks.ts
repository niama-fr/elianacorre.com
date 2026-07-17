import { ConvexError } from "convex/values";

import { loopsTaskRetryableFailures, type LoopsTasks, zLoopsTaskFailure } from "../schemas/loops-tasks";

const RETRYABLE_FAILURES = new Set<LoopsTasks["Failure"]>(loopsTaskRetryableFailures);

// RETRY POLICY ----------------------------------------------------------------------------------------------------------------------------
const CONTACT_RETRY_POLICY = { base: 2, initialBackoffMs: 60_000, maxAttempts: 10 } as const;
const CONFIRMATION_RETRY_POLICY = { base: 2, initialBackoffMs: 30_000, maxAttempts: 12 } as const;
const EBOOK_RETRY_POLICY = { base: 2, initialBackoffMs: 30_000, maxAttempts: 14 } as const;

export const getLoopsTaskRetryPolicy = (kind: LoopsTasks["Kind"]) => {
  if (kind === "sendConfirmationEmail") return CONFIRMATION_RETRY_POLICY;
  if (kind === "sendEbookEmail") return EBOOK_RETRY_POLICY;
  return CONTACT_RETRY_POLICY;
};

// FAILURE ---------------------------------------------------------------------------------------------------------------------------------
const isLoopsRequestFailureData = (data: unknown): data is LoopsRequestFailureData => {
  if (typeof data !== "object" || data === null) return false;
  const { category, code } = data as Record<string, unknown>;
  return code === "LOOPS_REQUEST_FAILED" && zLoopsTaskFailure.safeParse(category).success;
};

export const getLoopsTaskFailure = (error: unknown): LoopsTaskFailure => {
  if (!(error instanceof ConvexError)) return { failure: "unknown", retryable: false };

  if (!isLoopsRequestFailureData(error.data)) return { failure: "unknown", retryable: false };

  return {
    failure: error.data.category,
    retryable: RETRYABLE_FAILURES.has(error.data.category),
  };
};

export type LoopsTaskFailure = {
  failure: LoopsTasks["Failure"];
  retryable: boolean;
};
type LoopsRequestFailureData = {
  category: LoopsTasks["Failure"];
};

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const isLoopsTaskPending = (task: LoopsTasks["Doc"] | null) => task?.status === "pending";
