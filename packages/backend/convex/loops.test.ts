import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { register as registerLoops } from "@devwithbobby/loops/test";
import { createCapabilityToken } from "@ec/domain/helpers/capabilities";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { createIdentity } from "./test.auth";
import { modules } from "./test.setup";

vi.mock(import("@convex-dev/workflow"), async (importOriginal) => {
  const actual = await importOriginal();
  let workflowNumber = 0;
  // oxlint-disable-next-line eslint/require-await -- The mock preserves Workflow's asynchronous interface.
  const start = vi.fn<typeof actual.start>().mockImplementation(async () => {
    workflowNumber += 1;
    return `test-workflow-${workflowNumber}` as Awaited<ReturnType<typeof actual.start>>;
  });
  return { ...actual, start } satisfies typeof actual;
});

const loopsModules = import.meta.glob("../node_modules/@devwithbobby/loops/src/component/**/*.ts");
const WEBHOOK_SECRET_BYTES = new TextEncoder().encode("test-signing-secret");
const WEBHOOK_SECRET = `whsec_${btoa(String.fromCodePoint(...WEBHOOK_SECRET_BYTES))}`;
const CAPABILITY_SECRET = "test-capability-secret";

const signWebhook = async (id: string, timestamp: string, body: string) => {
  const key = await crypto.subtle.importKey("raw", WEBHOOK_SECRET_BYTES, { hash: "SHA-256", name: "HMAC" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return `v1,${btoa(String.fromCodePoint(...new Uint8Array(signature)))}`;
};

const createBackend = () => {
  const convex = convexTest(schema, modules);
  registerBetterAuth(convex);
  registerLoops(convex, "loops", loopsModules);
  registerAggregate(convex, "loops/contactAggregate");
  return convex;
};

describe("Loops delivery administration", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lets only an administrator inspect and replay a terminal failure without changing its business idempotency key", async () => {
    const convex = createBackend();
    const taskId = await convex.run(async (ctx) => {
      const profileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      return await ctx.db.insert("loopsTasks", {
        acknowledgedAt: null,
        failure: null,
        finishedAt: null,
        idempotencyKey: "stable-key",
        kind: "syncContact",
        profileId,
        replayCount: 0,
        status: "pending",
        subscribed: true,
        workflowIds: ["workflow-original"],
      });
    });
    await convex.mutation(internal.loops.markTaskFailed, {
      failure: "server",
      loopsTaskId: taskId,
    });
    const asAdmin = await createIdentity(convex, "admin");
    const asMember = await createIdentity(convex, "member");

    await expect(convex.query(api.loops.listFailedTasks, {})).rejects.toThrow("Unauthenticated");
    await expect(asMember.query(api.loops.listFailedTasks, {})).rejects.toThrow("Unauthorized");
    await expect(asAdmin.query(api.loops.listFailedTasks, {})).resolves.toMatchObject([
      {
        _id: taskId,
        acknowledgedAt: null,
        failure: "server",
        replayCount: 0,
        workflowIds: ["workflow-original"],
      },
    ]);

    await asAdmin.mutation(api.loops.acknowledgeFailedTask, { loopsTaskId: taskId });
    const [acknowledgedTask] = await asAdmin.query(api.loops.listFailedTasks, {});
    expect({ acknowledged: Number.isFinite(acknowledgedTask?.acknowledgedAt), taskId: acknowledgedTask?._id }).toStrictEqual({
      acknowledged: true,
      taskId,
    });

    await asAdmin.mutation(api.loops.replayFailedTask, { loopsTaskId: taskId });

    const replayed = await convex.run(async (ctx) => await ctx.db.get(taskId));
    expect(replayed).toMatchObject({
      acknowledgedAt: null,
      failure: null,
      finishedAt: null,
      idempotencyKey: "stable-key",
      replayCount: 1,
      status: "pending",
      workflowIds: ["test-workflow-1", "workflow-original"],
    });
  });
});

describe("Loops webhooks", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts an authentic resubscription for an unknown email as provider evidence only", async () => {
    vi.stubEnv("LOOPS_WEBHOOK_SECRET", WEBHOOK_SECRET);
    const convex = createBackend();
    const webhookId = "webhook-resubscribed-unknown";
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const body = JSON.stringify({
      contactIdentity: { email: "unknown@example.com", id: "contact-unknown", userId: null },
      email: { id: "message-resubscribed" },
      eventName: "email.resubscribed",
      eventTime: 10,
      webhookSchemaVersion: "1.0.0",
    });
    const signature = await signWebhook(webhookId, timestamp, body);

    await expect(
      convex.fetch("/loops/webhook", {
        body,
        headers: { "webhook-id": webhookId, "webhook-signature": signature, "webhook-timestamp": timestamp },
        method: "POST",
      })
    ).resolves.toMatchObject({ status: 204 });

    const state = await convex.run(async (ctx) => ({
      events: await ctx.db.query("loopsWebhooks").collect(),
      profiles: await ctx.db.query("profiles").collect(),
      subscriptions: await ctx.db.query("newsSubscriptions").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state).toMatchObject({
      events: [{ email: "unknown@example.com", kind: "email.resubscribed", occurredAt: 10_000, webhookId }],
      profiles: [],
      subscriptions: [],
      tasks: [],
    });
  });

  it("rejects unsigned and stale requests, then accepts an authentic Loops webhook", async () => {
    vi.stubEnv("LOOPS_WEBHOOK_SECRET", WEBHOOK_SECRET);
    const convex = createBackend();
    const profileId = await convex.run(async (ctx) => await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" }));
    const body = JSON.stringify({
      contactIdentity: { email: "reader@example.com", id: "contact-1", userId: null },
      email: { id: "message-1" },
      eventName: "email.hardBounced",
      eventTime: 10,
      webhookSchemaVersion: "1.0.0",
    });
    await expect(convex.fetch("/loops/webhook", { body, method: "POST" })).resolves.toMatchObject({ status: 401 });

    const webhookId = "webhook-authentic";
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const signature = await signWebhook(webhookId, timestamp, body);
    const staleTimestamp = `${Number(timestamp) - 301}`;
    const staleSignature = await signWebhook(webhookId, staleTimestamp, body);
    await expect(
      convex.fetch("/loops/webhook", {
        body,
        headers: { "webhook-id": webhookId, "webhook-signature": staleSignature, "webhook-timestamp": staleTimestamp },
        method: "POST",
      })
    ).resolves.toMatchObject({ status: 401 });
    const unsupportedBody = JSON.stringify({
      contactIdentity: { email: "reader@example.com", id: "contact-1", userId: null },
      email: { id: "message-1" },
      eventName: "email.delivered",
      eventTime: 10,
      webhookSchemaVersion: "1.0.0",
    });
    const unsupportedWebhookId = "webhook-unsupported";
    const unsupportedSignature = await signWebhook(unsupportedWebhookId, timestamp, unsupportedBody);
    await expect(
      convex.fetch("/loops/webhook", {
        body: unsupportedBody,
        headers: { "webhook-id": unsupportedWebhookId, "webhook-signature": unsupportedSignature, "webhook-timestamp": timestamp },
        method: "POST",
      })
    ).resolves.toMatchObject({ status: 400 });
    await expect(
      convex.fetch("/loops/webhook", {
        body,
        headers: { "webhook-id": webhookId, "webhook-signature": signature, "webhook-timestamp": timestamp },
        method: "POST",
      })
    ).resolves.toMatchObject({ status: 204 });

    const state = await convex.run(async (ctx) => ({
      event: await ctx.db.query("loopsWebhooks").unique(),
      restriction: await ctx.db.query("newsRestrictions").unique(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state).toMatchObject({
      event: { email: "reader@example.com", kind: "email.hardBounced", occurredAt: 10_000, webhookId },
      restriction: { reason: "permanentBounce", restrictedBy: "provider" },
      tasks: [{ profileId, subscribed: false }],
    });
  });

  it("records an unsubscribe once, ends consent, and preserves e-book access", async () => {
    vi.stubEnv("CAPABILITY_SIGNING_SECRET", CAPABILITY_SECRET);
    const convex = createBackend();
    const { ebookDownloadId, profileId, subscriptionId } = await convex.run(async (ctx) => {
      const insertedProfileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "privacy",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const newsletterConsentId = await ctx.db.insert("legalTexts", {
        content: "consent",
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
      const insertedSubscriptionId = await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 2,
        confirmedFrom: "email",
        legalBundleId,
        profileId: insertedProfileId,
        requestedAt: 1,
        unsubscribedAt: null,
      });
      const storageId = await ctx.storage.store(new Blob(["e-book"], { type: "application/pdf" }));
      const ebookId = await ctx.db.insert("ebooks", {
        fileName: "welcome.pdf",
        publishedAt: 2,
        publishedBy: adminId,
        status: "published",
        storageId,
        title: "Welcome",
        updatedAt: 2,
        uploadedBy: adminId,
        version: 1,
      });
      const ebookIssuanceId = await ctx.db.insert("ebookIssuances", { ebookId, kind: "initial", profileId: insertedProfileId });
      const insertedEbookDownloadId = await ctx.db.insert("ebookDownloads", { ebookIssuanceId });
      return { ebookDownloadId: insertedEbookDownloadId, profileId: insertedProfileId, subscriptionId: insertedSubscriptionId };
    });
    const ebookDownloadToken = await createCapabilityToken({ capabilityId: ebookDownloadId, secret: CAPABILITY_SECRET });
    const event = {
      email: "reader@example.com",
      kind: "email.unsubscribed" as const,
      messageId: "message-1",
      occurredAt: 10_000,
      webhookId: "webhook-1",
    };

    await Promise.all([convex.mutation(internal.loops.processWebhook, event), convex.mutation(internal.loops.processWebhook, event)]);

    const state = await convex.run(async (ctx) => ({
      events: await ctx.db.query("loopsWebhooks").collect(),
      subscription: await ctx.db.get(subscriptionId),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect({
      eventCount: state.events.length,
      tasks: state.tasks,
      unsubscribedAt: state.subscription?.unsubscribedAt,
    }).toMatchObject({ eventCount: 1, tasks: [{ profileId, subscribed: false }], unsubscribedAt: 10_000 });
    await expect(convex.fetch(`/newsletter/ebook?token=${ebookDownloadToken}`)).resolves.toMatchObject({ status: 200 });

    const restoredSubscriptionId = await convex.run(async (ctx) => {
      const previous = await ctx.db.get(subscriptionId);
      if (previous === null) throw new Error("Previous subscription was not found");
      return await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 20_000,
        confirmedFrom: "email",
        legalBundleId: previous.legalBundleId,
        profileId,
        requestedAt: 20_000,
        unsubscribedAt: null,
      });
    });
    await convex.mutation(internal.loops.processWebhook, {
      ...event,
      occurredAt: 5000,
      webhookId: "older-unsubscribe",
    });
    const restored = await convex.run(async (ctx) => ({
      subscription: await ctx.db.get(restoredSubscriptionId),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(restored.subscription?.unsubscribedAt).toBeNull();
    expect(restored.tasks).toHaveLength(1);
  });

  it("creates one new consent period and contact reconciliation for an ordinary resubscription", async () => {
    const convex = createBackend();
    const { activeLegalBundleId, historicalSubscriptionId, profileId } = await convex.run(async (ctx) => {
      const insertedProfileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "privacy",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const newsletterConsentId = await ctx.db.insert("legalTexts", {
        content: "consent",
        kind: "newsletterConsent",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const previousLegalBundleId = await ctx.db.insert("newsletterLegalBundles", {
        newsletterConsentId,
        privacyNoticeId,
        publishedAt: 1,
        publishedBy: adminId,
      });
      const insertedActiveLegalBundleId = await ctx.db.insert("newsletterLegalBundles", {
        newsletterConsentId,
        privacyNoticeId,
        publishedAt: 5000,
        publishedBy: adminId,
      });
      await ctx.db.insert("newsletterLegalBundles", {
        newsletterConsentId,
        privacyNoticeId,
        publishedAt: 15_000,
        publishedBy: adminId,
      });
      const insertedHistoricalSubscriptionId = await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 2000,
        confirmedFrom: "email",
        legalBundleId: previousLegalBundleId,
        profileId: insertedProfileId,
        requestedAt: 1000,
        unsubscribedAt: 4000,
      });
      return {
        activeLegalBundleId: insertedActiveLegalBundleId,
        historicalSubscriptionId: insertedHistoricalSubscriptionId,
        profileId: insertedProfileId,
      };
    });
    const event = {
      email: "reader@example.com",
      kind: "email.resubscribed" as const,
      messageId: "message-resubscribed",
      occurredAt: 10_000,
      webhookId: "webhook-resubscribed",
    };

    await Promise.all([convex.mutation(internal.loops.processWebhook, event), convex.mutation(internal.loops.processWebhook, event)]);
    await convex.mutation(internal.loops.processWebhook, {
      ...event,
      occurredAt: 20_000,
      webhookId: "webhook-resubscribed-already-active",
    });

    const state = await convex.run(async (ctx) => ({
      historical: await ctx.db.get(historicalSubscriptionId),
      subscriptions: await ctx.db.query("newsSubscriptions").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
      webhooks: await ctx.db.query("loopsWebhooks").collect(),
    }));
    expect(state.historical).toMatchObject({ confirmedAt: 2000, requestedAt: 1000, unsubscribedAt: 4000 });
    expect(state.subscriptions).toContainEqual(
      expect.objectContaining({
        confirmedAt: 10_000,
        confirmedFrom: "loops",
        legalBundleId: activeLegalBundleId,
        profileId,
        requestedAt: 10_000,
        unsubscribedAt: null,
      })
    );
    expect({ subscriptions: state.subscriptions.length, tasks: state.tasks, webhooks: state.webhooks.length }).toMatchObject({
      subscriptions: 2,
      tasks: [{ profileId, subscribed: true }],
      webhooks: 2,
    });

    vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");
    const asAdmin = await createIdentity(convex, "admin");
    const privacySubject = await asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" });
    expect(privacySubject?.newsletterConsent.periods).toContainEqual(
      expect.objectContaining({ confirmedAt: 10_000, confirmedFrom: "loops" })
    );
  });

  it.each(["permanentBounce", "spamComplaint"] as const)(
    "preserves a %s restriction and reconciles a resubscribed contact as unsubscribed",
    async (reason) => {
      const convex = createBackend();
      const { profileId, restrictionId } = await convex.run(async (ctx) => {
        const insertedProfileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
        const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
        const privacyNoticeId = await ctx.db.insert("legalTexts", {
          content: "privacy",
          kind: "privacyNotice",
          publishedAt: 1,
          publishedBy: adminId,
        });
        const newsletterConsentId = await ctx.db.insert("legalTexts", {
          content: "consent",
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
          confirmedAt: 1000,
          confirmedFrom: "email",
          legalBundleId,
          profileId: insertedProfileId,
          requestedAt: 1000,
          unsubscribedAt: 2000,
        });
        const insertedRestrictionId = await ctx.db.insert("newsRestrictions", {
          lastOccurredAt: 3000,
          profileId: insertedProfileId,
          reason,
          resolvedAt: null,
          resolvedBy: null,
          restrictedAt: 3000,
          restrictedBy: "provider",
          version: 1,
        });
        return { profileId: insertedProfileId, restrictionId: insertedRestrictionId };
      });

      await convex.mutation(internal.loops.processWebhook, {
        email: "reader@example.com",
        kind: "email.resubscribed",
        messageId: "message-resubscribed-restricted",
        occurredAt: 10_000,
        webhookId: "webhook-resubscribed-restricted",
      });

      const state = await convex.run(async (ctx) => ({
        restriction: await ctx.db.get(restrictionId),
        subscriptions: await ctx.db.query("newsSubscriptions").collect(),
        tasks: await ctx.db.query("loopsTasks").collect(),
      }));
      expect(state.restriction).toMatchObject({ reason, resolvedAt: null, version: 1 });
      expect(state.subscriptions).toContainEqual(
        expect.objectContaining({ confirmedAt: 10_000, profileId, requestedAt: 10_000, unsubscribedAt: null })
      );
      expect(state.tasks).toMatchObject([{ profileId, subscribed: false }]);
    }
  );

  it("retains stale resubscriptions without superseding newer consent or restriction events", async () => {
    const convex = createBackend();
    await convex.run(async (ctx) => {
      const profileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "privacy",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const newsletterConsentId = await ctx.db.insert("legalTexts", {
        content: "consent",
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
        confirmedAt: 20_000,
        confirmedFrom: "email",
        legalBundleId,
        profileId,
        requestedAt: 15_000,
        unsubscribedAt: 30_000,
      });
      await ctx.db.insert("newsRestrictions", {
        lastOccurredAt: 25_000,
        profileId,
        reason: "permanentBounce",
        resolvedAt: null,
        resolvedBy: null,
        restrictedAt: 25_000,
        restrictedBy: "provider",
        version: 1,
      });
    });

    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.resubscribed",
      messageId: "message-resubscribed-stale",
      occurredAt: 10_000,
      webhookId: "webhook-resubscribed-stale",
    });

    const state = await convex.run(async (ctx) => ({
      subscriptions: await ctx.db.query("newsSubscriptions").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
      webhooks: await ctx.db.query("loopsWebhooks").collect(),
    }));
    expect(state.subscriptions).toHaveLength(1);
    expect(state.tasks).toHaveLength(0);
    expect(state.webhooks).toMatchObject([{ kind: "email.resubscribed", occurredAt: 10_000 }]);
  });

  it("keeps complaint suppression when an older bounce arrives later", async () => {
    const convex = createBackend();
    await convex.run(async (ctx) => {
      await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
    });
    const base = { email: "reader@example.com", messageId: "message-1" } as const;

    await convex.mutation(internal.loops.processWebhook, {
      ...base,
      kind: "email.spamReported",
      occurredAt: 20_000,
      webhookId: "complaint",
    });
    await convex.mutation(internal.loops.processWebhook, {
      ...base,
      kind: "email.hardBounced",
      occurredAt: 10_000,
      webhookId: "older-bounce",
    });
    const state = await convex.run(async (ctx) => ({
      events: await ctx.db.query("loopsWebhooks").collect(),
      restriction: await ctx.db.query("newsRestrictions").unique(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state.restriction).toMatchObject({ reason: "spamComplaint", restrictedBy: "provider" });
    expect(state.events).toHaveLength(2);
    expect(state.tasks).toMatchObject([{ subscribed: false }, { subscribed: false }]);
  });
});
