import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";

import type { zLoopsTaskFailure } from "./loops-tasks";
import { zLoopsTaskFields } from "./loops-tasks";

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
    const task = zLoopsTaskFields.parse({
      ...common,
      failure: "server",
      finishedAt: 10,
      kind: "syncContact",
      profileId: "000000000000000000000000profiles",
      status: "failed",
      subscribed: true,
    });

    if (task.status === "failed") {
      expectTypeOf(task.failure).toEqualTypeOf<z.output<typeof zLoopsTaskFailure>>();
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
      invalid: zLoopsTaskFields.safeParse({ ...pendingTask, failure: "server" }).success,
      valid: zLoopsTaskFields.safeParse(pendingTask).success,
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
      invalid: zLoopsTaskFields.safeParse({ ...failedTask, failure: null }).success,
      valid: zLoopsTaskFields.safeParse(failedTask).success,
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
      invalid: zLoopsTaskFields.safeParse({ ...succeededTask, email: "reader@example.com" }).success,
      valid: zLoopsTaskFields.safeParse({ ...succeededTask, email: null }).success,
    }).toStrictEqual({ invalid: false, valid: true });
  });

  it("requires pending and failed contact-deletion tasks to retain their executable email", () => {
    const deletionTask = { ...common, email: null, kind: "deleteContact" };

    expect({
      failed: zLoopsTaskFields.safeParse({
        ...deletionTask,
        failure: "server",
        finishedAt: 10,
        status: "failed",
      }).success,
      pending: zLoopsTaskFields.safeParse({ ...deletionTask, status: "pending" }).success,
    }).toStrictEqual({ failed: false, pending: false });
  });

  it("requires a terminal task to retain at least one Workflow identifier", () => {
    expect(
      zLoopsTaskFields.safeParse({
        ...common,
        failure: "server",
        finishedAt: 10,
        kind: "syncContact",
        profileId: "000000000000000000000000profiles",
        status: "failed",
        subscribed: true,
        workflowIds: [],
      }).success
    ).toBeFalsy();
  });
});
