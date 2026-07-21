import { getStatus } from "@convex-dev/workflow";
import type { PrivacyRetentionBatchResult } from "@ec/backend/business/privacy-retention";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import { executeRetentionWorkflow } from "./retention";
import schema from "./schema";
import { createBackend, createIdentity } from "./test.auth";
import { modules } from "./test.setup";

vi.mock(import("@convex-dev/workflow"), async (importOriginal) => {
  const actual = await importOriginal();
  const workflowId = "test-workflow-id" as Awaited<ReturnType<typeof actual.start>>;
  return {
    ...actual,
    getStatus: vi.fn<typeof actual.getStatus>().mockResolvedValue({ running: [], type: "inProgress" }),
    start: vi.fn<typeof actual.start>().mockResolvedValue(workflowId),
  } satisfies typeof actual;
});

const NOW = Date.UTC(2026, 6, 15);

describe("retention Workflow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("exposes retention evidence only to administrators", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const asMember = await createIdentity(convex, "member");

    await expect(convex.query(api.retention.listRecentRuns, {})).rejects.toThrow("Unauthenticated");
    await expect(asMember.query(api.retention.listRecentRuns, {})).rejects.toThrow("Unauthorized");
    await expect(asAdmin.query(api.retention.listRecentRuns, {})).resolves.toStrictEqual([]);
  });

  it("sequences batches and marks successful completion", async () => {
    const calls: string[] = [];
    const results = [
      { cursor: "task-cursor", done: false, phase: "tasks" as const },
      { cursor: null, done: false, phase: "webhooks" as const },
      { cursor: null, done: true, phase: "profiles" as const },
    ].map((result) => ({
      ...result,
      anonymizedFormerProfiles: 0,
      anonymizedPendingProfiles: 0,
      deletedDownloads: 0,
      deletedTechnicalLogs: 0,
    }));

    await executeRetentionWorkflow({
      markCompleted: async () => await Promise.resolve(calls.push("completed")),
      markFailed: async (phase) => await Promise.resolve(calls.push(`failed:${phase}`)),
      runBatch: async ({ cursor, phase, stepNumber }) => {
        calls.push(`batch:${stepNumber}:${phase}:${cursor ?? "start"}`);
        const result = results.shift();
        if (!result) throw new Error("Unexpected Workflow batch");
        return await Promise.resolve(result);
      },
    });

    expect(calls).toStrictEqual(["batch:0:tasks:start", "batch:1:tasks:task-cursor", "batch:2:webhooks:start", "completed"]);
  });

  it("records the active phase when orchestration fails", async () => {
    const failure = new Error("batch failed");
    const markFailed = vi.fn<(phase: PrivacyRetentionBatchResult["phase"]) => Promise<void>>(async () => {
      await Promise.resolve();
    });

    await expect(
      executeRetentionWorkflow({
        markCompleted: async () => {
          await Promise.resolve();
        },
        markFailed,
        runBatch: async () => await Promise.reject(failure),
      })
    ).rejects.toBe(failure);
    expect(markFailed).toHaveBeenCalledWith("tasks");
  });

  it("persists observable completion and deduplicates an active start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = convexTest(schema, modules);
    const retentionRunId = await convex.mutation(internal.retention.startRun, {});
    await expect(convex.mutation(internal.retention.startRun, {})).resolves.toBe(retentionRunId);

    for (const phase of ["tasks", "webhooks", "downloads", "profiles"] as const)
      await convex.mutation(internal.retention.runBatch, { cursor: null, now: NOW, phase, retentionRunId });
    await convex.mutation(internal.retention.completeRun, { retentionRunId });

    await expect(convex.mutation(internal.retention.completeRun, { retentionRunId })).resolves.toBeNull();
    await convex.run(async (ctx) => {
      await expect(ctx.db.get(retentionRunId)).resolves.toMatchObject({
        _creationTime: NOW,
        finishedAt: NOW,
        status: "completed",
        workflowId: "test-workflow-id",
      });
    });
  });

  it("records a failed attempt and restarts with separate counters", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = convexTest(schema, modules);
    const failedRunId = await convex.mutation(internal.retention.startRun, {});
    await convex.mutation(internal.retention.failRun, { phase: "profiles", retentionRunId: failedRunId });

    const retryRunId = await convex.mutation(internal.retention.startRun, {});

    expect(retryRunId).not.toBe(failedRunId);
    await convex.run(async (ctx) => {
      await expect(ctx.db.get(failedRunId)).resolves.toMatchObject({ failurePhase: "profiles", status: "failed" });
      await expect(ctx.db.get(retryRunId)).resolves.toMatchObject({
        anonymizedFormerProfiles: 0,
        anonymizedPendingProfiles: 0,
        deletedDownloads: 0,
        deletedTechnicalLogs: 0,
        status: "running",
      });
    });
  });

  it("reconciles a canceled Workflow before starting a replacement", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = convexTest(schema, modules);
    const canceledRunId = await convex.mutation(internal.retention.startRun, {});
    vi.mocked(getStatus).mockResolvedValueOnce({ type: "canceled" });

    const replacementRunId = await convex.mutation(internal.retention.startRun, {});

    expect(replacementRunId).not.toBe(canceledRunId);
    await convex.run(async (ctx) => {
      await expect(ctx.db.get(canceledRunId)).resolves.toMatchObject({ failedAt: NOW, status: "failed" });
      await expect(ctx.db.get(replacementRunId)).resolves.toMatchObject({ status: "running" });
    });
  });
});
