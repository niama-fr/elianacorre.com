import type { Id } from "@ec/backend/types";
import { LoopsTaskNotFound } from "@ec/domain/errors/loops-tasks";
import type { LoopsTasks } from "@ec/domain/schemas/loops-tasks";
import type { WithNow } from "@ec/domain/schemas/utils";
import type { PaginationOptions } from "convex/server";
import { Effect as E, Option as O } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnPatchError, dieOnDecodeError, dieOnEncodeError, optionById, optionByIndex } from "./confect";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getLoopsTask = E.fn(function* (id: Id<"loopsTasks">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("loopsTasks").get(id).pipe(optionById);
});

export const getLoopsTaskByEbookDownload = E.fn(function* (downloadId: Id<"ebookDownloads">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("loopsTasks").get("by_ebook_download_id", downloadId).pipe(optionByIndex);
});

// REQUIRE ---------------------------------------------------------------------------------------------------------------------------------
export const requireLoopsTask = E.fn(function* (id: Id<"loopsTasks">) {
  return yield* O.match(yield* getLoopsTask(id), {
    onNone: () => new LoopsTaskNotFound(),
    onSome: E.succeed,
  });
});

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateExpiredLoopsTasks = E.fn(function* (pagination: PaginationOptions, before: number) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("loopsTasks")
    .index("by_finished_at", (q) => q.lte("finishedAt", before))
    .paginate(pagination)
    .pipe(dieOnDecodeError);
});

export const takeProfileLoopsTasks = E.fn(function* (limit: number, profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("loopsTasks")
    .index("by_profile_id", (q) => q.eq("profileId", profileId))
    .take(limit)
    .pipe(dieOnDecodeError);
});

export const takeFailedLoopsTasks = E.fn(function* (limit: number) {
  const reader = yield* DatabaseReader;
  return (yield* reader
    .table("loopsTasks")
    .index("by_status_and_finished_at", (q) => q.eq("status", "failed"), "desc")
    .take(limit)
    .pipe(dieOnDecodeError)) as LoopsTasks["FailedDoc"][];
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createLoopsTask = E.fn(function* (create: LoopsTasks["Create"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer
    .table("loopsTasks")
    .insert({
      ...create,
      acknowledgedAt: null,
      failure: null,
      finishedAt: null,
      replayCount: 0,
      status: "pending",
      workflowIds: [],
    })
    .pipe(dieOnEncodeError);
});

// PATCH -----------------------------------------------------------------------------------------------------------------------------------
export const replaceLoopsTaskWorkflows = E.fn(function* (id: Id<"loopsTasks">, workflowId: string) {
  const writer = yield* DatabaseWriter;
  yield* writer
    .table("loopsTasks")
    .patch(id, { workflowIds: [workflowId] })
    .pipe(dieOnPatchError);
});

export const setLoopsTaskAcknowledgedAt = E.fn(function* (id: Id<"loopsTasks">, now: number) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("loopsTasks").patch(id, { acknowledgedAt: now }).pipe(dieOnPatchError);
});

export const markLoopsTaskFailed = E.fn(function* (task: TaskRef, { failure, now }: MarkFailedOpts) {
  const writer = yield* DatabaseWriter;
  yield* writer
    .table("loopsTasks")
    .patch(task._id, { acknowledgedAt: null, failure, finishedAt: now, status: "failed" })
    .pipe(dieOnPatchError);
});
type MarkFailedOpts = WithNow<{ failure: LoopsTasks["Failure"] }>;

export const resetLoopsTaskForReplay = E.fn(function* (task: TaskRef, patch: ResetForReplayOpts) {
  const writer = yield* DatabaseWriter;
  yield* writer
    .table("loopsTasks")
    .patch(task._id, {
      acknowledgedAt: null,
      failure: null,
      finishedAt: null,
      replayCount: patch.replayCount,
      status: "pending",
      workflowIds: [...patch.workflowIds],
    })
    .pipe(dieOnPatchError);
});
type ResetForReplayOpts = Pick<LoopsTasks["PendingDoc"], "replayCount" | "workflowIds">;

export const markLoopsTaskSucceeded = E.fn(function* (task: TaskRef, { now }: WithNow) {
  const writer = yield* DatabaseWriter;
  if (task.kind === "deleteContact") {
    yield* writer.table("loopsTasks").patch(task._id, { email: null, finishedAt: now, status: "succeeded" }).pipe(dieOnPatchError);
    return;
  }
  yield* writer.table("loopsTasks").patch(task._id, { finishedAt: now, status: "succeeded" }).pipe(dieOnPatchError);
});

// DELETE -----------------------------------------------------------------------------------------------------------------------------------
export const deleteLoopsTask = E.fn(function* (id: Id<"loopsTasks">) {
  const writer = yield* DatabaseWriter;
  yield* writer.table("loopsTasks").delete(id);
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type TaskRef = Pick<LoopsTasks["PendingDoc"], "_id" | "kind">;
