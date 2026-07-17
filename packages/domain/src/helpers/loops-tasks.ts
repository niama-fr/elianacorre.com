import { ConvexError } from "convex/values";

import type { LoopsTasks } from "../schemas/loops-tasks";

const RETRYABLE_FAILURE_CATEGORIES = new Set<LoopsTaskFailureCategory>(["network", "rateLimited", "server"]);
const FAILURE_CATEGORIES = new Set<LoopsTaskFailureCategory>([
  "authentication",
  "missingResource",
  "network",
  "rateLimited",
  "server",
  "unknown",
  "validation",
]);

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
  const { category, code, status } = data as Record<string, unknown>;
  return (
    code === "LOOPS_REQUEST_FAILED" &&
    typeof category === "string" &&
    FAILURE_CATEGORIES.has(category as LoopsTaskFailureCategory) &&
    (typeof status === "number" || status === null)
  );
};

export const getLoopsTaskFailure = (error: unknown): LoopsTaskFailure => {
  if (!(error instanceof ConvexError)) return { failure: "unknown", retryable: false };

  if (!isLoopsRequestFailureData(error.data)) return { failure: "unknown", retryable: false };

  return {
    failure: error.data.category,
    retryable: RETRYABLE_FAILURE_CATEGORIES.has(error.data.category),
  };
};

export type LoopsTaskFailureCategory =
  | "authentication"
  | "missingResource"
  | "network"
  | "rateLimited"
  | "server"
  | "unknown"
  | "validation";
export type LoopsTaskFailure = {
  failure: LoopsTaskFailureCategory;
  retryable: boolean;
};
type LoopsRequestFailureData = {
  category: LoopsTaskFailureCategory;
  code: "LOOPS_REQUEST_FAILED";
  status: number | null;
};

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const isLoopsTaskPending = (task: LoopsTasks["Doc"] | null): task is Extract<LoopsTasks["Doc"], { status: "pending" }> =>
  task?.status === "pending";
