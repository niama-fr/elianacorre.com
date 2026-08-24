import { ConvexError } from "convex/values";
import { Option as O, Schema as S } from "effect";

import { loopsTaskRetryableFailures, type LoopsTasks, sLoopsTaskFailure } from "../schemas/loops-tasks";

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
  const parsed = S.decodeUnknownOption(S.Struct({ code: S.Literal("LOOPS_REQUEST_FAILED"), failure: sLoopsTaskFailure }))(error.data);
  return O.isSome(parsed) ? parsed.value.failure : "unknown";
};

// STATUS ----------------------------------------------------------------------------------------------------------------------------------
export const isLoopsTaskPending = (task: LoopsTasks["Doc"] | null) => task?.status === "pending";
