import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerLoops } from "@devwithbobby/loops/test";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

vi.mock(import("@convex-dev/workflow"), async (importOriginal) => {
  const actual = await importOriginal();
  const workflowId = "test-workflow-id" as Awaited<ReturnType<typeof actual.start>>;
  return { ...actual, start: vi.fn<typeof actual.start>().mockResolvedValue(workflowId) } satisfies typeof actual;
});

const loopsModules = import.meta.glob("../node_modules/@devwithbobby/loops/src/component/**/*.ts");
const WEBHOOK_SECRET_BYTES = new TextEncoder().encode("test-signing-secret");
const WEBHOOK_SECRET = `whsec_${btoa(String.fromCodePoint(...WEBHOOK_SECRET_BYTES))}`;

const signWebhook = async (id: string, timestamp: string, body: string) => {
  const key = await crypto.subtle.importKey("raw", WEBHOOK_SECRET_BYTES, { hash: "SHA-256", name: "HMAC" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return `v1,${btoa(String.fromCodePoint(...new Uint8Array(signature)))}`;
};

const createBackend = () => {
  const convex = convexTest(schema, modules);
  registerLoops(convex, "loops", loopsModules);
  registerAggregate(convex, "loops/contactAggregate");
  return convex;
};

describe("Loops webhooks", () => {
  afterEach(() => vi.unstubAllEnvs());

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
      block: await ctx.db.query("newsletterBlocks").unique(),
      event: await ctx.db.query("loopsWebhooks").unique(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state).toMatchObject({
      block: { email: "reader@example.com", reason: "bounced", source: "provider-webhook" },
      event: { email: "reader@example.com", kind: "email.hardBounced", sentAt: 10_000, webhookId },
      tasks: [{ profileId, subscribed: false }],
    });
  });

  it("records an unsubscribe once, ends consent, and preserves e-book access", async () => {
    const convex = createBackend();
    const { grantId, profileId, subscriptionId } = await convex.run(async (ctx) => {
      const insertedProfileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "privacy",
        kind: "privacy-notice",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const newsletterConsentId = await ctx.db.insert("legalTexts", {
        content: "consent",
        kind: "newsletter-consent",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const legalBundleId = await ctx.db.insert("newsletterLegalBundles", {
        newsletterConsentId,
        privacyNoticeId,
        publishedAt: 1,
        publishedBy: adminId,
      });
      const insertedSubscriptionId = await ctx.db.insert("newsletterSubs", {
        confirmTokenHash: null,
        confirmedAt: 2,
        legalBundleId,
        profileId: insertedProfileId,
        requestedAt: 1,
        unsubscribedAt: null,
      });
      const insertedGrantId = await ctx.db.insert("ebookGrants", {
        issuedAt: 3,
        profileId: insertedProfileId,
        tokenHash: "token",
      });
      return { grantId: insertedGrantId, profileId: insertedProfileId, subscriptionId: insertedSubscriptionId };
    });
    const event = {
      email: "reader@example.com",
      kind: "email.unsubscribed" as const,
      messageId: "message-1",
      sentAt: 10_000,
      webhookId: "webhook-1",
    };

    await Promise.all([convex.mutation(internal.loops.processWebhook, event), convex.mutation(internal.loops.processWebhook, event)]);

    const state = await convex.run(async (ctx) => ({
      events: await ctx.db.query("loopsWebhooks").collect(),
      grant: await ctx.db.get(grantId),
      subscription: await ctx.db.get(subscriptionId),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect({
      eventCount: state.events.length,
      grantId: state.grant?._id,
      tasks: state.tasks,
      unsubscribedAt: state.subscription?.unsubscribedAt,
    }).toMatchObject({ eventCount: 1, grantId, tasks: [{ profileId, subscribed: false }], unsubscribedAt: 10_000 });

    const restoredSubscriptionId = await convex.run(async (ctx) => {
      const previous = await ctx.db.get(subscriptionId);
      if (previous === null) throw new Error("Previous subscription was not found");
      return await ctx.db.insert("newsletterSubs", {
        confirmTokenHash: null,
        confirmedAt: 20_000,
        legalBundleId: previous.legalBundleId,
        profileId,
        requestedAt: 20_000,
        unsubscribedAt: null,
      });
    });
    await convex.mutation(internal.loops.processWebhook, {
      ...event,
      sentAt: 5000,
      webhookId: "older-unsubscribe",
    });
    const restoredSubscription = await convex.run(async (ctx) => await ctx.db.get(restoredSubscriptionId));
    expect(restoredSubscription?.unsubscribedAt).toBeNull();
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
      sentAt: 20_000,
      webhookId: "complaint",
    });
    await convex.mutation(internal.loops.processWebhook, {
      ...base,
      kind: "email.hardBounced",
      sentAt: 10_000,
      webhookId: "older-bounce",
    });
    const state = await convex.run(async (ctx) => ({
      block: await ctx.db.query("newsletterBlocks").unique(),
      events: await ctx.db.query("loopsWebhooks").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state.block).toMatchObject({ reason: "complained", source: "provider-webhook" });
    expect(state.events).toHaveLength(2);
    expect(state.tasks).toMatchObject([{ subscribed: false }, { subscribed: false }]);
  });
});
