import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { register as registerLoops } from "@devwithbobby/loops/test";
import { createCapabilityToken, verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

vi.mock(import("@convex-dev/workflow"), async (importOriginal) => {
  const actual = await importOriginal();
  const workflowId = "test-workflow-id" as Awaited<ReturnType<typeof actual.start>>;
  return { ...actual, start: vi.fn<typeof actual.start>().mockResolvedValue(workflowId) } satisfies typeof actual;
});

const loopsModules = import.meta.glob("../node_modules/@devwithbobby/loops/src/component/**/*.ts");
const CAPABILITY_SECRET = "test-capability-secret";
const SUPPRESSION_SECRET = "test-suppression-secret";
const NEWSLETTER_REQUEST_DEFAULTS = { firstName: "", requestIp: "127.0.0.1", website: "" } as const;

const createRequest = (email = "reader@example.com") => ({ consent: true, email, ...NEWSLETTER_REQUEST_DEFAULTS });

const createBackend = async () => {
  vi.stubEnv("CAPABILITY_SIGNING_SECRET", CAPABILITY_SECRET);
  vi.stubEnv("SUPPRESSION_HASH_SECRET", SUPPRESSION_SECRET);
  const convex = convexTest(schema, modules);
  registerRateLimiter(convex);
  registerLoops(convex, "loops", loopsModules);
  registerAggregate(convex, "loops/contactAggregate");
  await convex.run(async (ctx) => {
    const publishedAt = Date.now();
    const publishedBy = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
    const privacyNoticeId = await ctx.db.insert("legalTexts", {
      content: "privacy",
      kind: "privacyNotice",
      publishedAt,
      publishedBy,
    });
    const newsletterConsentId = await ctx.db.insert("legalTexts", {
      content: "consent",
      kind: "newsletterConsent",
      publishedAt,
      publishedBy,
    });
    await ctx.db.insert("newsletterLegalBundles", { newsletterConsentId, privacyNoticeId, publishedAt, publishedBy });
  });
  return convex;
};

const publishEbook = async (convex: TestConvex<typeof schema>) =>
  await convex.run(async (ctx) => {
    const admin = await ctx.db
      .query("profiles")
      .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
      .unique();
    if (admin === null) throw new Error("Admin profile was not found");
    const storageId = await ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    return await ctx.db.insert("ebooks", {
      fileName: "welcome.pdf",
      publishedAt: Date.now(),
      publishedBy: admin._id,
      status: "published",
      storageId,
      title: "Welcome",
      updatedAt: Date.now(),
      uploadedBy: admin._id,
      version: 1,
    });
  });

const getConfirmationToken = async (convex: TestConvex<typeof schema>, email = "reader@example.com") =>
  await convex.run(async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (query) => query.eq("email", email))
      .unique();
    if (profile === null) throw new Error("Profile was not found");
    const task = await ctx.db
      .query("loopsTasks")
      .filter((query) => query.and(query.eq(query.field("kind"), "sendConfirmationEmail"), query.eq(query.field("profileId"), profile._id)))
      .order("desc")
      .first();
    if (!task || task.kind !== "sendConfirmationEmail") throw new Error("Confirmation task was not found");
    return await createCapabilityToken({ capabilityId: task.newsConfirmationId, secret: CAPABILITY_SECRET });
  });

describe("newsletter subscription", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("records a pending consent period and queues a confirmation by capability id", async () => {
    const convex = await createBackend();

    await expect(convex.mutation(api.newsletter.subscribe, createRequest("  Reader+Carnet@Example.COM "))).resolves.toStrictEqual({
      accepted: true,
    });

    const state = await convex.run(async (ctx) => ({
      confirmations: await ctx.db.query("newsConfirmations").collect(),
      profiles: await ctx.db.query("profiles").collect(),
      subscriptions: await ctx.db.query("newsSubscriptions").collect(),
      task: await ctx.db.query("loopsTasks").unique(),
    }));
    expect({
      confirmations: state.confirmations,
      hasRawLinkToken: "linkToken" in (state.task ?? {}),
      profiles: state.profiles,
      subscriptions: state.subscriptions,
      task: state.task,
    }).toMatchObject({
      confirmations: [{ kind: "subscription" }],
      hasRawLinkToken: false,
      profiles: [{ email: "admin@example.com" }, { email: "reader+carnet@example.com", role: "contact" }],
      subscriptions: [{ confirmedAt: null, unsubscribedAt: null }],
      task: { kind: "sendConfirmationEmail", workflowId: "test-workflow-id" },
    });
  });

  it("keeps honeypot and suppression requests indistinguishable and side-effect free", async () => {
    const convex = await createBackend();
    const suppressedHash = await hashCanonicalEmail({ email: "suppressed@example.com", secret: SUPPRESSION_SECRET });
    await convex.run(async (ctx) => {
      await ctx.db.insert("newsSuppressions", { canonicalEmailHash: suppressedHash });
    });

    await expect(
      convex.mutation(api.newsletter.subscribe, { ...createRequest("trap@example.com"), website: "bot" })
    ).resolves.toStrictEqual({
      accepted: true,
    });
    await expect(convex.mutation(api.newsletter.subscribe, createRequest("suppressed@example.com"))).resolves.toStrictEqual({
      accepted: true,
    });

    const state = await convex.run(async (ctx) => ({
      profiles: await ctx.db.query("profiles").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state.profiles).toMatchObject([{ email: "admin@example.com" }]);
    expect(state.tasks).toHaveLength(0);
  });

  it("invalidates an older confirmation when a pending request is renewed", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const oldToken = await getConfirmationToken(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const latestToken = await getConfirmationToken(convex);

    await expect(convex.mutation(api.newsletter.confirm, { token: oldToken })).resolves.toStrictEqual({
      confirmed: false,
      downloadToken: null,
    });
    await expect(convex.mutation(api.newsletter.confirm, { token: latestToken })).resolves.toMatchObject({ confirmed: true });
  });

  it("confirms consent, grants e-book access, and preserves the issued e-book version", async () => {
    const convex = await createBackend();
    const ebookId = await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());

    const confirmation = await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    const state = await convex.run(async (ctx) => ({
      downloads: await ctx.db.query("ebookDownloads").collect(),
      issuances: await ctx.db.query("ebookIssuances").collect(),
      subscription: await ctx.db.query("newsSubscriptions").unique(),
    }));
    expect({
      confirmationStatus: confirmation.confirmed,
      downloadCount: state.downloads.length,
      issuance: state.issuances,
      subscriptionConfirmedAtType: typeof state.subscription?.confirmedAt,
    }).toMatchObject({
      confirmationStatus: true,
      downloadCount: 1,
      issuance: [{ ebookId, kind: "initial" }],
      subscriptionConfirmedAtType: "number",
    });
    await expect(convex.fetch(`/newsletter/ebook?token=${confirmation.downloadToken}`)).resolves.toMatchObject({ status: 200 });
  });

  it("issues a replacement e-book download for an active subscriber", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });

    await convex.mutation(api.newsletter.subscribe, createRequest());
    const state = await convex.run(async (ctx) => ({
      confirmations: await ctx.db.query("newsConfirmations").collect(),
      downloads: await ctx.db.query("ebookDownloads").collect(),
      issuances: await ctx.db.query("ebookIssuances").collect(),
    }));
    expect(state.issuances).toMatchObject([{ kind: "initial" }, { kind: "replacement" }]);
    expect(state.downloads).toHaveLength(2);
    expect(state.confirmations).toHaveLength(0);
  });

  it("creates a fresh consent period for a former subscriber", async () => {
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const token = await getConfirmationToken(convex);
    await convex.mutation(api.newsletter.confirm, { token });
    await convex.run(async (ctx) => {
      const subscription = await ctx.db.query("newsSubscriptions").unique();
      if (subscription === null) throw new Error("Subscription was not found");
      await ctx.db.patch(subscription._id, { unsubscribedAt: Date.now() });
    });

    await convex.mutation(api.newsletter.subscribe, createRequest());
    const state = await convex.run(async (ctx) => ({
      confirmations: await ctx.db.query("newsConfirmations").collect(),
      subscriptions: await ctx.db.query("newsSubscriptions").collect(),
    }));
    expect(state.subscriptions).toHaveLength(2);
    expect(state.confirmations).toMatchObject([{ kind: "subscription" }]);
  });

  it("restores delivery only after a current subscriber confirms a recovery link", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.spamReported",
      messageId: "message-1",
      occurredAt: Date.now(),
      webhookId: "complaint",
    });

    await convex.mutation(api.newsletter.subscribe, createRequest());
    const recoveryToken = await getConfirmationToken(convex);
    await expect(convex.mutation(api.newsletter.confirm, { token: recoveryToken })).resolves.toMatchObject({ confirmed: true });

    const state = await convex.run(async (ctx) => ({
      restriction: await ctx.db.query("newsRestrictions").unique(),
      subscribedTasks: await ctx.db
        .query("loopsTasks")
        .filter((query) => query.and(query.eq(query.field("kind"), "syncContact"), query.eq(query.field("subscribed"), true)))
        .collect(),
    }));
    expect(state.restriction).toMatchObject({ resolvedBy: "confirmation" });
    expect(state.subscribedTasks).toHaveLength(2);
  });

  it("does not send a recovery confirmation to a permanently bounced address", async () => {
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.hardBounced",
      messageId: "message-1",
      occurredAt: Date.now(),
      webhookId: "bounce",
    });

    await expect(convex.mutation(api.newsletter.subscribe, createRequest())).resolves.toStrictEqual({ accepted: true });
    const state = await convex.run(async (ctx) => ({
      confirmationTasks: await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "sendConfirmationEmail"))
        .collect(),
      confirmations: await ctx.db.query("newsConfirmations").collect(),
    }));
    expect({ confirmationCount: state.confirmations.length, confirmationTaskCount: state.confirmationTasks.length }).toStrictEqual({
      confirmationCount: 0,
      confirmationTaskCount: 1,
    });
  });

  it("does not let a stale recovery link clear a newer provider event", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T00:00:00Z"));
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.spamReported",
      messageId: "message-1",
      occurredAt: Date.now(),
      webhookId: "complaint",
    });
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const recoveryToken = await getConfirmationToken(convex);
    vi.advanceTimersByTime(1);
    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.hardBounced",
      messageId: "message-2",
      occurredAt: Date.now(),
      webhookId: "newer-bounce",
    });

    await expect(convex.mutation(api.newsletter.confirm, { token: recoveryToken })).resolves.toStrictEqual({
      confirmed: false,
      downloadToken: null,
    });
    const restriction = await convex.run(async (ctx) => await ctx.db.query("newsRestrictions").unique());
    expect(restriction).toMatchObject({ reason: "spamComplaint", resolvedAt: null, version: 2 });
  });

  it("does not clear a restriction that arrives after a subscription confirmation request in the same Loops second", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T00:00:00.500Z"));
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    vi.setSystemTime(new Date("2026-07-10T00:00:00.900Z"));
    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.spamReported",
      messageId: "message-1",
      occurredAt: Date.parse("2026-07-10T00:00:00Z"),
      webhookId: "same-second-complaint",
    });

    await expect(convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) })).resolves.toMatchObject({
      confirmed: true,
    });

    const state = await convex.run(async (ctx) => ({
      restriction: await ctx.db.query("newsRestrictions").unique(),
      subscribedTasks: await ctx.db
        .query("loopsTasks")
        .filter((query) => query.and(query.eq(query.field("kind"), "syncContact"), query.eq(query.field("subscribed"), true)))
        .collect(),
    }));
    expect(state.restriction).toMatchObject({ resolvedAt: null });
    expect(state.subscribedTasks).toHaveLength(0);
  });

  it("ignores a delayed provider event that predates a resolved restriction", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T00:00:00Z"));
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    const complaintAt = Date.now();
    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.spamReported",
      messageId: "message-1",
      occurredAt: complaintAt,
      webhookId: "complaint",
    });
    await convex.mutation(api.newsletter.subscribe, createRequest());
    vi.advanceTimersByTime(1);
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.hardBounced",
      messageId: "message-2",
      occurredAt: complaintAt,
      webhookId: "delayed-bounce",
    });

    const restrictions = await convex.run(async (ctx) => await ctx.db.query("newsRestrictions").collect());
    expect(restrictions).toMatchObject([{ reason: "spamComplaint", resolvedBy: "confirmation" }]);
    expect(restrictions).toHaveLength(1);
  });

  it("rejects a fourth pending request within fifteen minutes without queueing another email", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-10T00:00:00Z"));
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await expect(convex.mutation(api.newsletter.subscribe, createRequest())).resolves.toStrictEqual({ accepted: true });

    const tasks = await convex.run(async (ctx) => await ctx.db.query("loopsTasks").collect());
    expect(tasks).toHaveLength(3);
  });

  it("creates a signed confirmation URL when the Loops task executes", async () => {
    vi.stubEnv("LOOPS_API_KEY", "test-key");
    vi.stubEnv("LOOPS_CONFIRMATION_TRANSACTIONAL_ID", "confirmation-template");
    vi.stubEnv("SITE_URL", "https://staging.elianacorre.com");
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ messageId: "loops-message" }));
    vi.stubGlobal("fetch", send);
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const task = await convex.run(async (ctx) => await ctx.db.query("loopsTasks").unique());
    if (!task || task.kind !== "sendConfirmationEmail") throw new Error("Confirmation task was not found");

    await convex.action(internal.loops.execute, { loopsTaskId: task._id });

    const request = send.mock.calls[0]?.[1];
    if (!request || typeof request.body !== "string") throw new Error("Loops request body was not found");
    const { confirmationUrl } = z
      .object({ dataVariables: z.object({ confirmationUrl: z.string() }) })
      .parse(JSON.parse(request.body)).dataVariables;
    const token = new URL(confirmationUrl).searchParams.get("token");
    await expect(verifyCapabilityToken({ secret: CAPABILITY_SECRET, token: token ?? "" })).resolves.toBe(task.newsConfirmationId);
  });

  it("retries a Loops confirmation task with one idempotency key and records its terminal time", async () => {
    vi.stubEnv("LOOPS_API_KEY", "test-key");
    vi.stubEnv("LOOPS_CONFIRMATION_TRANSACTIONAL_ID", "confirmation-template");
    vi.stubEnv("SITE_URL", "https://staging.elianacorre.com");
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ messageId: "loops-message" }));
    vi.stubGlobal("fetch", send);
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const task = await convex.run(async (ctx) => await ctx.db.query("loopsTasks").unique());
    if (!task || task.kind !== "sendConfirmationEmail") throw new Error("Confirmation task was not found");

    await expect(convex.action(internal.loops.execute, { loopsTaskId: task._id })).rejects.toThrow(
      "Loops service error. Please try again later."
    );
    await convex.action(internal.loops.execute, { loopsTaskId: task._id });
    await convex.mutation(internal.loops.markTaskSucceeded, { loopsTaskId: task._id });

    const completedTask = await convex.run(async (ctx) => await ctx.db.get("loopsTasks", task._id));
    const firstIdempotencyKey = new Headers(send.mock.calls[0]?.[1]?.headers).get("Idempotency-Key");
    const secondIdempotencyKey = new Headers(send.mock.calls[1]?.[1]?.headers).get("Idempotency-Key");
    expect({
      callCount: send.mock.calls.length,
      finishedAtType: typeof completedTask?.finishedAt,
      firstIdempotencyKeyType: typeof firstIdempotencyKey,
      sameIdempotencyKey: firstIdempotencyKey === secondIdempotencyKey,
      status: completedTask?.status,
    }).toStrictEqual({
      callCount: 2,
      finishedAtType: "number",
      firstIdempotencyKeyType: "string",
      sameIdempotencyKey: true,
      status: "succeeded",
    });
  });
});
