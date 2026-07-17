import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  enforceNewsletterRetentionBatch,
  getFormerSubscriberCutoff,
  PENDING_RETENTION_MS,
  TECHNICAL_RETENTION_MS,
  type NewsletterRetentionBatchResult,
} from "../business/newsletter-retention";
import schema from "./schema";
import { modules } from "./test.setup";

const NOW = Date.UTC(2026, 6, 15);

const runRetentionTestBatch = async (
  convex: TestConvex<typeof schema>,
  options: { cursor: string | null; now: number; phase: NewsletterRetentionBatchResult["phase"] }
) => await convex.run(async (ctx) => await enforceNewsletterRetentionBatch(ctx, options));

const enforceAllRetention = async (convex: TestConvex<typeof schema>, now: number) => {
  let cursor: string | null = null;
  let phase: NewsletterRetentionBatchResult["phase"] = "tasks";
  while (true) {
    const result = await runRetentionTestBatch(convex, { cursor, now, phase });
    if (result.done) return;
    const { cursor: nextCursor, phase: nextPhase } = result;
    cursor = nextCursor;
    phase = nextPhase;
  }
};

describe("newsletter retention policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
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
      const accountProfileId = await ctx.db.insert("profiles", { email: "account@example.com", role: "member" });
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
        acknowledgedAt: null,
        alertedAt: null,
        failureCategory: null,
        failureCode: null,
        failureStatus: null,
        finishedAt: null,
        idempotencyKey: "account-confirmation",
        kind: "sendConfirmationEmail",
        newsConfirmationId: accountConfirmationId,
        profileId: accountProfileId,
        replayCount: 0,
        status: "pending",
        workflowId: "account-workflow",
        workflowIds: ["account-workflow"],
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
    vi.setSystemTime(getFormerSubscriberCutoff(NOW) - 24 * 60 * 60 * 1000);
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
        unsubscribedAt: getFormerSubscriberCutoff(NOW),
      });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 1,
        legalBundleId,
        profileId: retainedProfileId,
        requestedAt: 1,
        unsubscribedAt: getFormerSubscriberCutoff(NOW) + 1,
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
        acknowledgedAt: null,
        alertedAt: null,
        ebookDownloadId: retryDownloadId,
        failureCategory: null,
        failureCode: null,
        failureStatus: null,
        finishedAt: null,
        idempotencyKey: "retry-download",
        kind: "sendEbookEmail",
        profileId,
        replayCount: 0,
        status: "pending",
        workflowId: "retry-workflow",
        workflowIds: ["retry-workflow"],
      });
      const expiredTaskId = await ctx.db.insert("loopsTasks", {
        acknowledgedAt: null,
        alertedAt: null,
        email: "expired@example.com",
        failureCategory: null,
        failureCode: null,
        failureStatus: null,
        finishedAt: NOW - TECHNICAL_RETENTION_MS,
        idempotencyKey: "expired-task",
        kind: "deleteContact",
        replayCount: 0,
        status: "succeeded",
        workflowId: "expired-workflow",
        workflowIds: ["expired-workflow"],
      });
      const retainedTaskId = await ctx.db.insert("loopsTasks", {
        acknowledgedAt: null,
        alertedAt: null,
        email: "retained@example.com",
        failureCategory: null,
        failureCode: null,
        failureStatus: null,
        finishedAt: NOW - TECHNICAL_RETENTION_MS + 1,
        idempotencyKey: "retained-task",
        kind: "deleteContact",
        replayCount: 0,
        status: "succeeded",
        workflowId: "retained-workflow",
        workflowIds: ["retained-workflow"],
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
});
