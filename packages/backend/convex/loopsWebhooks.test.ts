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

  it("rejects unsigned requests and accepts an authentic Loops delivery event", async () => {
    vi.stubEnv("LOOPS_WEBHOOK_SECRET", WEBHOOK_SECRET);
    const convex = createBackend();
    const body = JSON.stringify({
      contactIdentity: { email: "reader@example.com", id: "contact-1", userId: null },
      email: { id: "message-1" },
      eventName: "email.delivered",
      eventTime: 10,
      webhookSchemaVersion: "1.0.0",
    });
    await expect(convex.fetch("/webhooks/loops", { body, method: "POST" })).resolves.toMatchObject({ status: 401 });

    const id = "webhook-authentic";
    const timestamp = "10";
    const signature = await signWebhook(id, timestamp, body);
    await expect(
      convex.fetch("/webhooks/loops", {
        body,
        headers: { "webhook-id": id, "webhook-signature": signature, "webhook-timestamp": timestamp },
        method: "POST",
      })
    ).resolves.toMatchObject({ status: 204 });

    const event = await convex.run(async (ctx) => await ctx.db.query("loopsWebhookEvents").unique());
    expect(event).toMatchObject({ email: "reader@example.com", eventName: "email.delivered", webhookId: id });
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
      eventName: "email.unsubscribed" as const,
      eventTime: 10,
      messageId: "message-1",
      receivedAt: 11_000,
      webhookId: "webhook-1",
    };

    await expect(
      Promise.all([convex.mutation(internal.loopsWebhooks.process, event), convex.mutation(internal.loopsWebhooks.process, event)])
    ).resolves.toStrictEqual([{ duplicate: false }, { duplicate: true }]);

    const state = await convex.run(async (ctx) => ({
      events: await ctx.db.query("loopsWebhookEvents").collect(),
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
    await convex.mutation(internal.loopsWebhooks.process, { ...event, eventTime: 5, webhookId: "older-unsubscribe" });
    const restoredSubscription = await convex.run(async (ctx) => await ctx.db.get(restoredSubscriptionId));
    expect(restoredSubscription?.unsubscribedAt).toBeNull();
  });

  it("keeps complaint suppression through duplicate and out-of-order delivery events", async () => {
    const convex = createBackend();
    await convex.run(async (ctx) => {
      await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
    });
    const base = { email: "reader@example.com", messageId: "message-1", receivedAt: 20_000 } as const;

    await convex.mutation(internal.loopsWebhooks.process, {
      ...base,
      eventName: "email.spamReported",
      eventTime: 20,
      webhookId: "complaint",
    });
    await convex.mutation(internal.loopsWebhooks.process, {
      ...base,
      eventName: "email.hardBounced",
      eventTime: 30,
      webhookId: "newer-bounce",
    });
    await convex.mutation(internal.loopsWebhooks.process, {
      ...base,
      eventName: "email.delivered",
      eventTime: 10,
      webhookId: "older-delivery",
    });

    const state = await convex.run(async (ctx) => ({
      block: await ctx.db.query("newsletterBlocks").unique(),
      events: await ctx.db.query("loopsWebhookEvents").collect(),
    }));
    expect(state.block).toMatchObject({ reason: "complained", source: "provider-webhook" });
    expect(state.events).toHaveLength(3);
  });
});
