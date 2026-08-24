import { Ref } from "@confect/core";
import { getStatus } from "@convex-dev/workflow";
import type { PrivacyRetentionBatchResult } from "@ec/backend/features/privacy-retention";
import refs from "@ec/backend/refs";
import type { TestConvex } from "convex-test";
import { convexTest } from "convex-test";
import { Effect as E } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { executeRetentionWorkflow } from "../../features/privacy-retention";
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

type QueryCaller = Pick<TestConvex<typeof schema>, "query">;

const listRecentRuns = async (convex: QueryCaller) =>
  await E.runPromise(
    Ref.runWithCodec(refs.public.retention.listRecentRuns, {}, async (functionReference, encodedArgs): Promise<unknown> => {
      const encodedReturns: unknown = await convex.query(functionReference, encodedArgs as never);

      return encodedReturns;
    })
  );

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

    await expect(listRecentRuns(convex)).rejects.toThrow("Unauthenticated");
    await expect(listRecentRuns(asMember)).rejects.toThrow("Unauthorized");
    await expect(listRecentRuns(asAdmin)).resolves.toStrictEqual([]);
  });

  it("sequences batches and marks successful completion", async () => {
    const calls: string[] = [];

    const results: PrivacyRetentionBatchResult[] = [
      {
        anonymizedFormerProfiles: 0,
        anonymizedPendingProfiles: 0,
        cursor: "task-cursor",
        deletedDownloads: 0,
        deletedTechnicalLogs: 0,
        done: false,
        phase: "tasks",
      },
      {
        anonymizedFormerProfiles: 0,
        anonymizedPendingProfiles: 0,
        cursor: null,
        deletedDownloads: 0,
        deletedTechnicalLogs: 0,
        done: false,
        phase: "webhooks",
      },
      {
        anonymizedFormerProfiles: 0,
        anonymizedPendingProfiles: 0,
        cursor: null,
        deletedDownloads: 0,
        deletedTechnicalLogs: 0,
        done: true,
        phase: "profiles",
      },
    ];

    await E.runPromise(
      executeRetentionWorkflow({
        markCompleted: () =>
          E.sync(() => {
            calls.push("completed");
          }),
        markFailed: (phase) =>
          E.sync(() => {
            calls.push(`failed:${phase}`);
          }),
        runBatch: ({ cursor, phase, stepNumber }) =>
          E.sync(() => {
            calls.push(`batch:${stepNumber}:${phase}:${cursor ?? "start"}`);

            const result = results.shift();

            if (!result) throw new Error("Unexpected Workflow batch");

            return result;
          }),
      })
    );

    expect(calls).toStrictEqual(["batch:0:tasks:start", "batch:1:tasks:task-cursor", "batch:2:webhooks:start", "completed"]);
  });

  it("records the active phase when orchestration fails", async () => {
    const failure = new Error("batch failed");

    const markFailed = vi.fn<(phase: PrivacyRetentionBatchResult["phase"]) => E.Effect<void>>(() => E.void);

    await expect(
      E.runPromise(
        executeRetentionWorkflow({
          markCompleted: () => E.void,
          markFailed,
          runBatch: () => E.fail(failure),
        })
      )
    ).rejects.toThrow("batch failed");

    expect(markFailed).toHaveBeenCalledWith("tasks");
  });

  it("persists observable completion and deduplicates an active start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const convex = convexTest(schema, modules);
    const retentionRunId = await convex.mutation(internal.retention.startRun, {});

    await expect(convex.mutation(internal.retention.startRun, {})).resolves.toBe(retentionRunId);

    for (const phase of ["tasks", "webhooks", "downloads", "profiles"] as const)
      await convex.mutation(internal.retention.runBatch, {
        cursor: null,
        now: NOW,
        phase,
        retentionRunId,
      });

    await convex.mutation(internal.retention.completeRun, {
      retentionRunId,
    });

    await expect(
      convex.mutation(internal.retention.completeRun, {
        retentionRunId,
      })
    ).resolves.toBeNull();

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

    await convex.mutation(internal.retention.failRun, {
      phase: "profiles",
      retentionRunId: failedRunId,
    });

    const retryRunId = await convex.mutation(internal.retention.startRun, {});

    expect(retryRunId).not.toBe(failedRunId);

    await convex.run(async (ctx) => {
      await expect(ctx.db.get(failedRunId)).resolves.toMatchObject({
        failurePhase: "profiles",
        status: "failed",
      });

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

    vi.mocked(getStatus).mockResolvedValueOnce({
      type: "canceled",
    });

    const replacementRunId = await convex.mutation(internal.retention.startRun, {});

    expect(replacementRunId).not.toBe(canceledRunId);

    await convex.run(async (ctx) => {
      await expect(ctx.db.get(canceledRunId)).resolves.toMatchObject({
        failedAt: NOW,
        status: "failed",
      });

      await expect(ctx.db.get(replacementRunId)).resolves.toMatchObject({
        status: "running",
      });
    });
  });
});
