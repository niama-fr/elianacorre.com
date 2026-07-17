import { describe, expect, it } from "vitest";

import { zLoopsTaskFields } from "./loops-tasks";

const common = {
  acknowledgedAt: null,
  alertedAt: null,
  failureCategory: null,
  failureCode: null,
  failureStatus: null,
  finishedAt: null,
  idempotencyKey: "confirmation-1",
  replayCount: 0,
  workflowId: "workflow-1",
  workflowIds: ["workflow-1"],
} as const;

describe("Loops task state", () => {
  it("accepts only empty failure and completion fields while a task is pending", () => {
    const pendingTask = {
      ...common,
      kind: "sendConfirmationEmail",
      newsConfirmationId: "000000000000000000000000newsConfirmations",
      profileId: "000000000000000000000000profiles",
      status: "pending",
    };

    expect({
      invalid: zLoopsTaskFields.safeParse({ ...pendingTask, failureCategory: "server" }).success,
      valid: zLoopsTaskFields.safeParse(pendingTask).success,
    }).toStrictEqual({ invalid: false, valid: true });
  });

  it("requires structured failure metadata for a failed task", () => {
    const failedTask = {
      ...common,
      alertedAt: 10,
      failureCategory: "server",
      failureCode: "LOOPS_REQUEST_FAILED",
      failureStatus: 503,
      finishedAt: 10,
      kind: "syncContact",
      profileId: "000000000000000000000000profiles",
      status: "failed",
      subscribed: true,
    };

    expect({
      invalid: zLoopsTaskFields.safeParse({ ...failedTask, failureCode: null }).success,
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
});
