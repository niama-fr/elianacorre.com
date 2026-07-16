import { getStatus } from "@convex-dev/workflow";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createNewsletterPortabilityExport,
  enforceNewsletterRetentionBatch,
  formerSubscriberCutoff,
  PENDING_RETENTION_MS,
  TECHNICAL_RETENTION_MS,
  type RetentionPhase,
} from "../business/retention";
import { internal } from "./_generated/api";
import { executeRetentionWorkflow } from "./privacy";
import schema from "./schema";
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

const runRetentionTestBatch = async (
  convex: TestConvex<typeof schema>,
  options: { cursor: string | null; now: number; phase: RetentionPhase }
) => await convex.run(async (ctx) => await enforceNewsletterRetentionBatch(ctx, options));

const enforceAllRetention = async (convex: TestConvex<typeof schema>, now: number) => {
  let cursor: string | null = null;
  let phase: RetentionPhase = "tasks";
  while (true) {
    const result = await runRetentionTestBatch(convex, { cursor, now, phase });
    if (result.done) return;
    const { cursor: nextCursor, phase: nextPhase } = result;
    cursor = nextCursor;
    phase = nextPhase;
  }
};

describe("newsletter retention and portability", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("sequences Workflow batches and marks successful completion", async () => {
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

  it("records the active phase when Workflow orchestration fails", async () => {
    const failure = new Error("batch failed");
    const markFailed = vi.fn<(phase: RetentionPhase) => Promise<void>>(async () => {
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

  it("deletes pending identifying data at 30 days but not immediately before the boundary", async () => {
    const convex = convexTest(schema, modules);
    const ids = await convex.run(async (ctx) => {
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "Privacy",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const newsletterConsentId = await ctx.db.insert("legalTexts", {
        content: "Consent",
        kind: "newsletterConsent",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const legalBundleId = await ctx.db.insert("newsletterLegalBundles", {
        newsletterConsentId,
        privacyNoticeId,
        publishedAt: 1,
        publishedBy: adminId,
      });
      const retainedProfileId = await ctx.db.insert("profiles", { email: "retained@example.com", role: "contact" });
      const expiredProfileId = await ctx.db.insert("profiles", { email: "expired@example.com", role: "contact" });
      const accountProfileId = await ctx.db.insert("profiles", { email: "account@example.com", role: "contact" });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: null,
        legalBundleId,
        profileId: retainedProfileId,
        requestedAt: NOW - PENDING_RETENTION_MS + 1,
        unsubscribedAt: null,
      });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: null,
        legalBundleId,
        profileId: expiredProfileId,
        requestedAt: NOW - PENDING_RETENTION_MS,
        unsubscribedAt: null,
      });
      const accountSubscriptionId = await ctx.db.insert("newsSubscriptions", {
        confirmedAt: null,
        legalBundleId,
        profileId: accountProfileId,
        requestedAt: NOW - PENDING_RETENTION_MS,
        unsubscribedAt: null,
      });
      const accountConfirmationId = await ctx.db.insert("newsConfirmations", {
        kind: "subscription",
        restrictionId: null,
        restrictionVersion: null,
        subscriptionId: accountSubscriptionId,
      });
      const accountTaskId = await ctx.db.insert("loopsTasks", {
        error: null,
        finishedAt: null,
        idempotencyKey: "account-confirmation",
        kind: "sendConfirmationEmail",
        newsConfirmationId: accountConfirmationId,
        profileId: accountProfileId,
        status: "pending",
        workflowId: "account-workflow",
      });
      await ctx.db.insert("identities", { adapter: "better-auth", adapterId: "account-user", profileId: accountProfileId });
      return { accountConfirmationId, accountProfileId, accountTaskId, expiredProfileId, retainedProfileId };
    });

    await enforceAllRetention(convex, NOW);

    await convex.run(async (ctx) => {
      const expiredProfile = await ctx.db.get(ids.expiredProfileId);
      expect(expiredProfile?.email.endsWith("@anonymized.invalid")).toBeTruthy();
      await expect(ctx.db.get(ids.retainedProfileId)).resolves.not.toBeNull();
      await expect(ctx.db.get(ids.accountProfileId)).resolves.toMatchObject({ email: "account@example.com" });
      await expect(ctx.db.get(ids.accountConfirmationId)).resolves.toBeNull();
      await expect(ctx.db.get(ids.accountTaskId)).resolves.toBeNull();
    });
  });

  it("applies the three-year calendar boundary and removes e-book access without creating delivery work", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(formerSubscriberCutoff(NOW) - 24 * 60 * 60 * 1000);
    const convex = convexTest(schema, modules);
    const { profileId, retainedProfileId: recentProfileId } = await convex.run(async (ctx) => {
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const formerProfileId = await ctx.db.insert("profiles", {
        email: "former@example.com",
        firstName: "Former",
        role: "contact",
      });
      const retainedProfileId = await ctx.db.insert("profiles", { email: "recent-former@example.com", role: "contact" });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "Privacy",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const newsletterConsentId = await ctx.db.insert("legalTexts", {
        content: "Consent",
        kind: "newsletterConsent",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const legalBundleId = await ctx.db.insert("newsletterLegalBundles", {
        newsletterConsentId,
        privacyNoticeId,
        publishedAt: 1,
        publishedBy: adminId,
      });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 1,
        legalBundleId,
        profileId: formerProfileId,
        requestedAt: 1,
        unsubscribedAt: formerSubscriberCutoff(NOW),
      });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 1,
        legalBundleId,
        profileId: retainedProfileId,
        requestedAt: 1,
        unsubscribedAt: formerSubscriberCutoff(NOW) + 1,
      });
      const storageId = await ctx.storage.store(new Blob(["book"]));
      const ebookId = await ctx.db.insert("ebooks", {
        fileName: "book.pdf",
        publishedAt: 1,
        publishedBy: adminId,
        status: "published",
        storageId,
        title: "Book",
        updatedAt: 1,
        uploadedBy: adminId,
        version: 1,
      });
      await ctx.db.insert("ebookIssuances", { ebookId, kind: "initial", profileId: formerProfileId });
      return { profileId: formerProfileId, retainedProfileId };
    });

    vi.setSystemTime(NOW);
    await enforceAllRetention(convex, NOW);

    await convex.run(async (ctx) => {
      const profile = await ctx.db.get(profileId);
      expect(profile?.email.endsWith("@anonymized.invalid")).toBeTruthy();
      expect(profile?.role).toBe("contact");
      await expect(ctx.db.get(recentProfileId)).resolves.toMatchObject({ email: "recent-former@example.com" });
      await expect(ctx.db.query("ebookIssuances").collect()).resolves.toStrictEqual([]);
      await expect(ctx.db.query("loopsTasks").collect()).resolves.toStrictEqual([]);
    });
  });

  it("uses business timestamps at the 90-day boundary and preserves retry dependencies", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW - 2 * TECHNICAL_RETENTION_MS);
    const convex = convexTest(schema, modules);
    const ids = await convex.run(async (ctx) => {
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const profileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      const storageId = await ctx.storage.store(new Blob(["book"]));
      const ebookId = await ctx.db.insert("ebooks", {
        fileName: "book.pdf",
        publishedAt: 1,
        publishedBy: adminId,
        status: "published",
        storageId,
        title: "Book",
        updatedAt: 1,
        uploadedBy: adminId,
        version: 1,
      });
      const issuanceId = await ctx.db.insert("ebookIssuances", { ebookId, kind: "initial", profileId });
      const expiredDownloadId = await ctx.db.insert("ebookDownloads", { ebookIssuanceId: issuanceId });
      const retryDownloadId = await ctx.db.insert("ebookDownloads", { ebookIssuanceId: issuanceId });
      await ctx.db.insert("loopsTasks", {
        ebookDownloadId: retryDownloadId,
        error: null,
        finishedAt: null,
        idempotencyKey: "retry-download",
        kind: "sendEbookEmail",
        profileId,
        status: "pending",
        workflowId: "retry-workflow",
      });
      const expiredTaskId = await ctx.db.insert("loopsTasks", {
        email: "expired@example.com",
        error: null,
        finishedAt: NOW - TECHNICAL_RETENTION_MS,
        idempotencyKey: "expired-task",
        kind: "deleteContact",
        status: "succeeded",
        workflowId: "expired-workflow",
      });
      const retainedTaskId = await ctx.db.insert("loopsTasks", {
        email: "retained@example.com",
        error: null,
        finishedAt: NOW - TECHNICAL_RETENTION_MS + 1,
        idempotencyKey: "retained-task",
        kind: "deleteContact",
        status: "succeeded",
        workflowId: "retained-workflow",
      });
      const expiredWebhookId = await ctx.db.insert("loopsWebhooks", {
        email: "expired@example.com",
        kind: "email.unsubscribed",
        messageId: "expired-message",
        occurredAt: NOW - TECHNICAL_RETENTION_MS,
        webhookId: "expired-webhook",
      });
      const retainedWebhookId = await ctx.db.insert("loopsWebhooks", {
        email: "retained@example.com",
        kind: "email.unsubscribed",
        messageId: "retained-message",
        occurredAt: NOW - TECHNICAL_RETENTION_MS + 1,
        webhookId: "retained-webhook",
      });
      return { expiredDownloadId, expiredTaskId, expiredWebhookId, retainedTaskId, retainedWebhookId, retryDownloadId };
    });
    vi.setSystemTime(NOW);

    await enforceAllRetention(convex, NOW);

    await convex.run(async (ctx) => {
      await expect(ctx.db.get(ids.expiredTaskId)).resolves.toBeNull();
      await expect(ctx.db.get(ids.expiredWebhookId)).resolves.toBeNull();
      await expect(ctx.db.get(ids.expiredDownloadId)).resolves.toBeNull();
      const retainedRecords = await Promise.all([
        ctx.db.get(ids.retainedTaskId),
        ctx.db.get(ids.retainedWebhookId),
        ctx.db.get(ids.retryDownloadId),
      ]);
      expect(retainedRecords).not.toContain(null);
    });

    await enforceAllRetention(convex, NOW);
    await convex.run(async (ctx) => {
      await expect(ctx.db.get(ids.retainedTaskId)).resolves.not.toBeNull();
      await expect(ctx.db.get(ids.retryDownloadId)).resolves.not.toBeNull();
    });
  });

  it("exports reconstructable provider-independent state without capabilities or technical logs", async () => {
    vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");
    const convex = convexTest(schema, modules);
    const result = await convex.run(async (ctx) => {
      const admin = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      await ctx.db.insert("profiles", { email: "reader@example.com", firstName: "Reader", role: "contact" });
      await ctx.db.insert("newsSuppressions", { canonicalEmailHash: "minimum-objection-hash" });
      await ctx.db.insert("loopsTasks", {
        email: "technical@example.com",
        error: "secret-provider-error",
        finishedAt: 1,
        idempotencyKey: "secret-idempotency-key",
        kind: "deleteContact",
        status: "failed",
        workflowId: "secret-workflow-id",
      });
      await ctx.db.insert("loopsWebhooks", {
        email: "technical@example.com",
        kind: "email.hardBounced",
        messageId: "secret-message-id",
        occurredAt: 1,
        webhookId: "secret-webhook-id",
      });
      const adminProfile = await ctx.db.get(admin);
      if (!adminProfile) throw new Error("Admin profile was not found");
      return {
        csv: await createNewsletterPortabilityExport({ ...ctx, profile: adminProfile }, "csv"),
        json: await createNewsletterPortabilityExport({ ...ctx, profile: adminProfile }, "json"),
      };
    });

    expect(result.json.content).toContain("reader@example.com");
    expect(result.json.content).toContain("minimum-objection-hash");
    expect(result.csv.content).toContain('"suppression"');
    expect(result.csv.content).toContain("minimum-objection-hash");
    for (const exportResult of [result.csv, result.json]) {
      expect(exportResult.content).not.toContain("secret-provider-error");
      expect(exportResult.content).not.toContain("secret-idempotency-key");
      expect(exportResult.content).not.toContain("secret-message-id");
      expect(exportResult.content).not.toContain("secret-workflow-id");
      expect(exportResult.content).not.toContain("secret-webhook-id");
    }
  });

  it("persists observable run completion and deduplicates an active start", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = convexTest(schema, modules);
    const retentionRunId = await convex.mutation(internal.privacy.startRetention, {});
    await expect(convex.mutation(internal.privacy.startRetention, {})).resolves.toBe(retentionRunId);

    for (const phase of ["tasks", "webhooks", "downloads", "profiles"] as const)
      await convex.mutation(internal.privacy.runRetentionBatch, { cursor: null, now: NOW, phase, retentionRunId });
    await convex.mutation(internal.privacy.markRetentionCompleted, { retentionRunId });

    await expect(convex.mutation(internal.privacy.markRetentionCompleted, { retentionRunId })).resolves.toBeNull();
    await convex.run(async (ctx) => {
      await expect(ctx.db.get(retentionRunId)).resolves.toMatchObject({
        finishedAt: NOW,
        startedAt: NOW,
        status: "completed",
        workflowId: "test-workflow-id",
      });
    });
  });

  it("records a failed Workflow attempt and restarts with separate counters", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = convexTest(schema, modules);
    const failedRunId = await convex.mutation(internal.privacy.startRetention, {});
    await convex.mutation(internal.privacy.markRetentionFailed, { phase: "profiles", retentionRunId: failedRunId });

    const retryRunId = await convex.mutation(internal.privacy.startRetention, {});

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

  it("reconciles a canceled Workflow before starting a new attempt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = convexTest(schema, modules);
    const canceledRunId = await convex.mutation(internal.privacy.startRetention, {});
    vi.mocked(getStatus).mockResolvedValueOnce({ type: "canceled" });

    const replacementRunId = await convex.mutation(internal.privacy.startRetention, {});

    expect(replacementRunId).not.toBe(canceledRunId);
    await convex.run(async (ctx) => {
      await expect(ctx.db.get(canceledRunId)).resolves.toMatchObject({ failedAt: NOW, status: "failed" });
      await expect(ctx.db.get(replacementRunId)).resolves.toMatchObject({ status: "running" });
    });
  });
});
