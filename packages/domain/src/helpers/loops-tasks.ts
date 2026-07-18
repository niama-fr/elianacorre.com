import { ConvexError } from "convex/values";
import z from "zod";

import { loopsTaskRetryableFailures, type LoopsTasks, zLoopsTaskFailure } from "../schemas/loops-tasks";

// IDEMPOTENCY -----------------------------------------------------------------------------------------------------------------------------
export const getLoopsTaskDeliveryIdempotencyKey = ({ idempotencyKey, replayCount }: DeliveryIdempotencyOpts): string =>
  replayCount === 0 ? idempotencyKey : `${idempotencyKey}:replay:${replayCount}`;
type DeliveryIdempotencyOpts = Pick<LoopsTasks["Fields"], "idempotencyKey" | "replayCount">;

// RETRY POLICY ----------------------------------------------------------------------------------------------------------------------------
const CONTACT_RETRY_POLICY = { base: 2, initialBackoffMs: 60_000, maxAttempts: 10 } as const;
const CONFIRMATION_RETRY_POLICY = { base: 2, initialBackoffMs: 30_000, maxAttempts: 12 } as const;
const EBOOK_RETRY_POLICY = { base: 2, initialBackoffMs: 30_000, maxAttempts: 14 } as const;

export const getLoopsTaskRetryPolicy = (kind: LoopsTasks["Kind"]) => {
  if (kind === "sendConfirmationEmail") return CONFIRMATION_RETRY_POLICY;
  if (kind === "sendEbookEmail") return EBOOK_RETRY_POLICY;
  return CONTACT_RETRY_POLICY;
};

export const isLoopsTaskRetryable = (failure: LoopsTasks["Failure"]): boolean => loopsTaskRetryableFailures.some((f) => f === failure);

// FAILURE ---------------------------------------------------------------------------------------------------------------------------------
export const classifyLoopsTaskFailure = (error: unknown): LoopsTasks["Failure"] => {
  if (!(error instanceof ConvexError)) return "unknown";
  const r = z.object({ code: z.literal("LOOPS_REQUEST_FAILED"), failure: zLoopsTaskFailure }).safeParse(error.data);
  return r.success ? r.data.failure : "unknown";
};

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const isLoopsTaskPending = (task: LoopsTasks["Doc"] | null) => task?.status === "pending";
