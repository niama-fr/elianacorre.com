import type { Id } from "@ec/backend/types";
import type { LoopsWebhooks } from "@ec/domain/schemas/loops-webhooks";
import type { PaginationOptions } from "convex/server";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnPatchError, dieOnDecodeError, dieOnEncodeError, optionByIndex } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getLoopsWebhookById = E.fn(function* (webhookId: string) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("loopsWebhooks").get("by_webhook_id", webhookId).pipe(optionByIndex);
});

// LIST -------------------------------------------------------------------------------------------------------------------------------------
export const paginateExpiredLoopsWebhooks = E.fn(function* (pagination: PaginationOptions, before: number) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("loopsWebhooks")
    .index("by_occurred_at", (q) => q.lte("occurredAt", before))
    .paginate(pagination)
    .pipe(dieOnDecodeError);
});

export const takeLoopsWebhooksByEmail = E.fn(function* (limit: number, email: string) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("loopsWebhooks")
    .index("by_email", (q) => q.eq("email", email))
    .take(limit)
    .pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createLoopsWebhook = E.fn(function* (create: LoopsWebhooks["Create"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("loopsWebhooks").insert(create).pipe(dieOnEncodeError);
});

// PATCH ----------------------------------------------------------------------------------------------------------------------------------
export const patchLoopsWebhook = E.fn(function* (id: Id<"loopsWebhooks">, patch: Partial<LoopsWebhooks["Fields"]>) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("loopsWebhooks").patch(id, patch).pipe(dieOnPatchError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteLoopsWebhook = E.fn(function* (id: Id<"loopsWebhooks">) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("loopsWebhooks").delete(id);
});
