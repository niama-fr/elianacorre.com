import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  enforcePrivacyRetentionBatch,
  getContactRequestCutoff,
  getFormerSubscriberCutoff,
  PENDING_RETENTION_MS,
  TECHNICAL_RETENTION_MS,
  type PrivacyRetentionBatchResult,
} from "../business/privacy-retention";
import schema from "./schema";
import { modules } from "./test.setup";

const NOW = Date.UTC(2026, 6, 15);

const runRetentionTestBatch = async (
  convex: TestConvex<typeof schema>,
  options: { cursor: string | null; now: number; phase: PrivacyRetentionBatchResult["phase"] }
) => await convex.run(async (ctx) => await enforcePrivacyRetentionBatch(ctx, options));

const enforceAllRetention = async (convex: TestConvex<typeof schema>, now: number) => {
  let cursor: string | null = null;
  let phase: PrivacyRetentionBatchResult["phase"] = "tasks";
  while (true) {
    const result = await runRetentionTestBatch(convex, { cursor, now, phase });
    if (result.done) return;
    const { cursor: nextCursor, phase: nextPhase } = result;
    cursor = nextCursor;
    phase = nextPhase;
  }
};

describe("privacy retention policy", () => {
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
        confirmedFrom: null,
        legalBundleId,
        profileId: retainedProfileId,
        requestedAt: NOW - PENDING_RETENTION_MS + 1,
        unsubscribedAt: null,
      });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: null,
        confirmedFrom: null,
        legalBundleId,
        profileId: expiredProfileId,
        requestedAt: NOW - PENDING_RETENTION_MS,
        unsubscribedAt: null,
      });
      const accountSubscriptionId = await ctx.db.insert("newsSubscriptions", {
        confirmedAt: null,
        confirmedFrom: null,
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
        failure: null,
        finishedAt: null,
        idempotencyKey: "account-confirmation",
        kind: "sendConfirmationEmail",
        newsConfirmationId: accountConfirmationId,
        profileId: accountProfileId,
        replayCount: 0,
        status: "pending",
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

  it("deletes contact requests and anonymizes contact-only profiles after twelve months", async () => {
    vi.useFakeTimers();
    const convex = convexTest(schema, modules);

    vi.setSystemTime(getContactRequestCutoff(NOW) - 1000);
    const expiredProfileId = await convex.run(async (ctx) => {
      const profileId = await ctx.db.insert("profiles", {
        email: "expired-contact@example.com",
        firstName: "Expired",
        role: "contact",
      });
      await ctx.db.insert("contactRequests", { message: "Old request", profileId });
      return profileId;
    });

    vi.setSystemTime(getContactRequestCutoff(NOW) + 1);
    const retainedProfileId = await convex.run(async (ctx) => {
      const profileId = await ctx.db.insert("profiles", { email: "recent-contact@example.com", role: "contact" });
      await ctx.db.insert("contactRequests", { message: "Recent request", profileId });
      return profileId;
    });

    vi.setSystemTime(NOW);
    await enforceAllRetention(convex, NOW);

    await convex.run(async (ctx) => {
      const expiredProfile = await ctx.db.get(expiredProfileId);
      expect(expiredProfile?.email.endsWith("@anonymized.invalid")).toBeTruthy();
      expect(expiredProfile).not.toHaveProperty("firstName");
      await expect(ctx.db.get(retainedProfileId)).resolves.toMatchObject({ email: "recent-contact@example.com" });
      await expect(ctx.db.query("contactRequests").collect()).resolves.toHaveLength(1);
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
        confirmedFrom: "email",
        legalBundleId,
        profileId: formerProfileId,
        requestedAt: 1,
        unsubscribedAt: getFormerSubscriberCutoff(NOW),
      });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 1,
        confirmedFrom: "email",
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
        ebookDownloadId: retryDownloadId,
        failure: null,
        finishedAt: null,
        idempotencyKey: "retry-download",
        kind: "sendEbookEmail",
        profileId,
        replayCount: 0,
        status: "pending",
        workflowIds: ["retry-workflow"],
      });
      const expiredTaskId = await ctx.db.insert("loopsTasks", {
        acknowledgedAt: null,
        email: null,
        failure: null,
        finishedAt: NOW - TECHNICAL_RETENTION_MS,
        idempotencyKey: "expired-task",
        kind: "deleteContact",
        replayCount: 0,
        status: "succeeded",
        workflowIds: ["expired-workflow"],
      });
      const retainedTaskId = await ctx.db.insert("loopsTasks", {
        acknowledgedAt: null,
        email: null,
        failure: null,
        finishedAt: NOW - TECHNICAL_RETENTION_MS + 1,
        idempotencyKey: "retained-task",
        kind: "deleteContact",
        replayCount: 0,
        status: "succeeded",
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
