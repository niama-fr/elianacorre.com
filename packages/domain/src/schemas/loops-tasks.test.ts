import { Schema as S } from "effect";
import { describe, expect, expectTypeOf, it } from "vitest";

import { type LoopsTasks, sLoopsTaskFields } from "./loops-tasks";

const common = {
  acknowledgedAt: null,
  failure: null,
  finishedAt: null,
  idempotencyKey: "confirmation-1",
  replayCount: 0,
  workflowIds: ["workflow-1"],
} as const;

describe("Loops task state", () => {
  it("narrows state-dependent fields from the status discriminator", () => {
    const task: unknown = {
      ...common,
      failure: "server",
      finishedAt: 10,
      kind: "syncContact",
      profileId: "000000000000000000000000profiles",
      status: "failed",
      subscribed: true,
    };

    if (!S.is(sLoopsTaskFields)(task)) throw new Error("Expected a valid Loops task");

    if (task.status === "failed") {
      expectTypeOf(task.failure).toEqualTypeOf<LoopsTasks["Failure"]>();

      expectTypeOf(task.finishedAt).toEqualTypeOf<number>();
    }
  });

  it("accepts only empty failure and completion fields while a task is pending", () => {
    const pendingTask = {
      ...common,
      kind: "sendConfirmationEmail",
      newsConfirmationId: "000000000000000000000000newsConfirmations",
      profileId: "000000000000000000000000profiles",
      status: "pending",
    };

    expect({
      invalid: S.is(sLoopsTaskFields)({ ...pendingTask, failure: "server" }),
      valid: S.is(sLoopsTaskFields)(pendingTask),
    }).toStrictEqual({ invalid: false, valid: true });
  });

  it("requires structured failure metadata for a failed task", () => {
    const failedTask = {
      ...common,
      failure: "server",
      finishedAt: 10,
      kind: "syncContact",
      profileId: "000000000000000000000000profiles",
      status: "failed",
      subscribed: true,
    };

    expect({
      invalid: S.is(sLoopsTaskFields)({ ...failedTask, failure: null }),
      valid: S.is(sLoopsTaskFields)(failedTask),
    }).toStrictEqual({ invalid: false, valid: true });
  });

  it("requires a succeeded contact-deletion task to redact its email", () => {
    const succeededTask = {
      ...common,
      finishedAt: 10,
      kind: "deleteContact",
      status: "succeeded",
    };

    expect({
      invalid: S.is(sLoopsTaskFields)({ ...succeededTask, email: "reader@example.com" }),
      valid: S.is(sLoopsTaskFields)({ ...succeededTask, email: null }),
    }).toStrictEqual({ invalid: false, valid: true });
  });

  it("requires pending and failed contact-deletion tasks to retain their executable email", () => {
    const deletionTask = { ...common, email: null, kind: "deleteContact" };

    expect({
      failed: S.is(sLoopsTaskFields)({
        ...deletionTask,
        failure: "server",
        finishedAt: 10,
        status: "failed",
      }),
      pending: S.is(sLoopsTaskFields)({ ...deletionTask, status: "pending" }),
    }).toStrictEqual({ failed: false, pending: false });
  });

  it("requires a terminal task to retain at least one Workflow identifier", () => {
    expect(
      S.is(sLoopsTaskFields)({
        ...common,
        failure: "server",
        finishedAt: 10,
        kind: "syncContact",
        profileId: "000000000000000000000000profiles",
        status: "failed",
        subscribed: true,
        workflowIds: [],
      })
    ).toBeFalsy();
  });
});
