import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { register as registerLoops } from "@devwithbobby/loops/test";
import { createCapabilityToken, verifyCapabilityToken } from "@ec/domain/helpers/capabilities";
import { getLoopsTaskFailure } from "@ec/domain/helpers/loops-tasks";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { resolveEbookIssuanceFromToken } from "../business/ebooks";
import { api, components, internal } from "./_generated/api";
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
const createEbookRecoveryRequest = (email = "reader@example.com") => ({ email, requestIp: "127.0.0.1", website: "" });

const createBackend = async () => {
  vi.stubEnv("CAPABILITY_SIGNING_SECRET", CAPABILITY_SECRET);
  vi.stubEnv("SITE_URL", "https://www.elianacorre.com");
  vi.stubEnv("SUPPRESSION_HASH_SECRET", SUPPRESSION_SECRET);
  const convex = convexTest(schema, modules);
  registerBetterAuth(convex);
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

const authenticateAdmin = async (convex: TestConvex<typeof schema>) => {
  const now = Date.now();
  const user = z.object({ _id: z.string() }).parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: now, email: "admin@example.com", emailVerified: true, name: "admin", updatedAt: now },
        model: "user",
      },
    })
  );
  const session = z.object({ _id: z.string() }).parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: now, expiresAt: now + 60_000, token: "admin-session", updatedAt: now, userId: user._id },
        model: "session",
      },
    })
  );
  await convex.run(async (ctx) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
      .unique();
    if (profile === null) throw new Error("Admin profile was not found");
    await ctx.db.insert("identities", { adapter: "better-auth", adapterId: user._id, profileId: profile._id });
  });
  return convex.withIdentity({ sessionId: session._id, subject: user._id });
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

    await expect(convex.mutation(api.newsletter.subscribe, createRequest("  Reader+Carnet@Example.COM "))).resolves.toBeNull();

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
      task: { kind: "sendConfirmationEmail", workflowIds: ["test-workflow-id"] },
    });
  });

  it("keeps honeypot and suppression requests indistinguishable and side-effect free", async () => {
    const convex = await createBackend();
    const suppressedHash = await hashCanonicalEmail({ email: "suppressed@example.com", secret: SUPPRESSION_SECRET });
    await convex.run(async (ctx) => {
      await ctx.db.insert("newsSuppressions", { canonicalEmailHash: suppressedHash });
    });

    await expect(convex.mutation(api.newsletter.subscribe, { ...createRequest("trap@example.com"), website: "bot" })).resolves.toBeNull();
    await expect(convex.mutation(api.newsletter.subscribe, createRequest("suppressed@example.com"))).resolves.toBeNull();

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

  it("issues a replacement e-book download when an active subscriber requests recovery", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });

    await expect(convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest())).resolves.toBeNull();

    const state = await convex.run(async (ctx) => ({
      downloads: await ctx.db.query("ebookDownloads").collect(),
      issuances: await ctx.db.query("ebookIssuances").collect(),
      subscriptions: await ctx.db.query("newsSubscriptions").collect(),
    }));
    expect(state.issuances).toMatchObject([{ kind: "initial" }, { kind: "replacement" }]);
    expect(state.downloads).toHaveLength(2);
    expect(state.subscriptions).toMatchObject([{ unsubscribedAt: null }]);
  });

  it("recovers Welcome E-book Access once a version is published after confirmation", async () => {
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await expect(convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) })).resolves.toStrictEqual({
      confirmed: true,
      downloadToken: null,
    });
    await publishEbook(convex);

    await expect(convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest())).resolves.toBeNull();

    const state = await convex.run(async (ctx) => ({
      issuances: await ctx.db.query("ebookIssuances").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state.issuances).toMatchObject([{ kind: "replacement" }]);
    expect(state.tasks.filter((task) => task.kind === "sendEbookEmail")).toHaveLength(1);
  });

  it("preserves Welcome E-book Access after ordinary unsubscription", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    await convex.run(async (ctx) => {
      const subscription = await ctx.db.query("newsSubscriptions").unique();
      if (subscription === null) throw new Error("Subscription was not found");
      await ctx.db.patch(subscription._id, { unsubscribedAt: Date.now() });
    });

    await expect(convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest())).resolves.toBeNull();

    const state = await convex.run(async (ctx) => ({
      confirmations: await ctx.db.query("newsConfirmations").collect(),
      issuances: await ctx.db.query("ebookIssuances").collect(),
      subscriptions: await ctx.db.query("newsSubscriptions").collect(),
    }));
    expect(state.issuances).toMatchObject([{ kind: "initial" }, { kind: "replacement" }]);
    expect(state.confirmations).toHaveLength(0);
    expect(state.subscriptions).toHaveLength(1);
    expect(state.subscriptions[0]?.unsubscribedAt).toStrictEqual(expect.any(Number));
  });

  it("does not recover an expired Former Newsletter Subscriber's e-book access", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const confirmation = await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    await convex.run(async (ctx) => {
      const subscription = await ctx.db.query("newsSubscriptions").unique();
      if (subscription === null) throw new Error("Subscription was not found");
      await ctx.db.patch(subscription._id, { unsubscribedAt: Date.now() });
    });
    vi.setSystemTime(new Date("2023-01-01T00:00:00Z"));

    await expect(convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest())).resolves.toBeNull();
    const expiredDownloadResponse = await convex.fetch(`/newsletter/ebook?token=${confirmation.downloadToken}`);
    expect(expiredDownloadResponse.status).toBe(302);
    expect(expiredDownloadResponse.headers.get("location")).toBe("https://www.elianacorre.com/newsletter/ebook");

    const state = await convex.run(async (ctx) => ({
      issuances: await ctx.db.query("ebookIssuances").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state.issuances).toHaveLength(1);
    expect(state.tasks.filter((task) => task.kind === "sendEbookEmail")).toHaveLength(1);
  });

  it("retains former-subscriber access until the three-calendar-year anniversary", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2020-01-01T00:00:00Z"));
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    await convex.run(async (ctx) => {
      const subscription = await ctx.db.query("newsSubscriptions").unique();
      if (subscription === null) throw new Error("Subscription was not found");
      await ctx.db.patch(subscription._id, { unsubscribedAt: Date.now() });
    });
    vi.setSystemTime(new Date("2022-12-31T12:00:00Z"));

    await convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest());

    vi.setSystemTime(new Date("2025-12-31T11:59:00Z"));
    await convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest());

    const issuances = await convex.run(async (ctx) => await ctx.db.query("ebookIssuances").collect());
    expect(issuances).toMatchObject([{ kind: "initial" }, { kind: "replacement" }, { kind: "replacement" }]);
  });

  it("keeps unknown and suppressed recovery requests neutral without delivery", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    const suppressedHash = await hashCanonicalEmail({ email: "reader@example.com", secret: SUPPRESSION_SECRET });
    await convex.run(async (ctx) => {
      await ctx.db.insert("newsSuppressions", { canonicalEmailHash: suppressedHash });
    });

    await expect(
      Promise.all([
        convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest("unknown@example.com")),
        convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest("reader@example.com")),
      ])
    ).resolves.toStrictEqual([null, null]);

    const state = await convex.run(async (ctx) => ({
      issuances: await ctx.db.query("ebookIssuances").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state.issuances).toHaveLength(1);
    expect(state.tasks.filter((task) => task.kind === "sendEbookEmail")).toHaveLength(1);
  });

  it("revokes Welcome E-book Access when the Profile is erased", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const confirmation = await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    await convex.run(async (ctx) => {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_email", (query) => query.eq("email", "reader@example.com"))
        .unique();
      if (profile === null) throw new Error("Profile was not found");
      await ctx.db.delete(profile._id);
    });

    await expect(convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest())).resolves.toBeNull();
    const erasedProfileResponse = await convex.fetch(`/newsletter/ebook?token=${confirmation.downloadToken}`);
    expect(erasedProfileResponse.status).toBe(302);
    expect(erasedProfileResponse.headers.get("location")).toBe("https://www.elianacorre.com/newsletter/ebook");

    const state = await convex.run(async (ctx) => ({
      issuances: await ctx.db.query("ebookIssuances").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state.issuances).toHaveLength(1);
    expect(state.tasks.filter((task) => task.kind === "sendEbookEmail")).toHaveLength(1);
  });

  it("returns invalid tokens and missing files to the neutral recovery page", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const confirmation = await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });

    const invalidTokenResponse = await convex.fetch("/newsletter/ebook?token=invalid");
    await convex.run(async (ctx) => {
      const ebook = await ctx.db.query("ebooks").unique();
      if (ebook === null) throw new Error("Published e-book was not found");
      await ctx.storage.delete(ebook.storageId);
    });
    const missingFileResponse = await convex.fetch(`/newsletter/ebook?token=${confirmation.downloadToken}`);

    expect([invalidTokenResponse.status, missingFileResponse.status]).toStrictEqual([302, 302]);
    expect([invalidTokenResponse.headers.get("location"), missingFileResponse.headers.get("location")]).toStrictEqual([
      "https://www.elianacorre.com/newsletter/ebook",
      "https://www.elianacorre.com/newsletter/ebook",
    ]);
  });

  it("records the current published version for each recovery, including publication rollback", async () => {
    const convex = await createBackend();
    const firstEbookId = await publishEbook(convex);
    const asAdmin = await authenticateAdmin(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });
    const secondStorageId = await convex.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["%PDF-1.7 v2"], { type: "application/pdf" }));
      // @ts-expect-error -- convex-test omits Blob MIME metadata from its _storage fixture.
      await ctx.db.patch(storageId, { contentType: "application/pdf" });
      return storageId;
    });
    const secondEbookResult = await asAdmin.mutation(api.ebooks.create, {
      fileName: "welcome-v2.pdf",
      storageId: secondStorageId,
      title: "Welcome v2",
    });
    if (secondEbookResult.data === undefined) throw new Error("Second e-book draft creation failed");
    const secondEbookId = secondEbookResult.data;
    await asAdmin.mutation(api.ebooks.publish, { ebookId: secondEbookId });

    await convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest());
    await asAdmin.mutation(api.ebooks.publish, { ebookId: firstEbookId });
    await convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest());

    const issuances = await convex.run(async (ctx) => await ctx.db.query("ebookIssuances").collect());
    expect(issuances.map((issuance) => issuance.ebookId)).toStrictEqual([firstEbookId, secondEbookId, firstEbookId]);
  });

  it("keeps each e-book capability usable until its own 72-hour expiry", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const confirmation = await convex.mutation(api.newsletter.confirm, { token: await getConfirmationToken(convex) });

    await convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest());
    await convex.mutation(api.ebooks.requestRecovery, createEbookRecoveryRequest());
    const downloads = await convex.run(async (ctx) => await ctx.db.query("ebookDownloads").order("asc").collect());
    const [initialDownload, replacementDownload, latestDownload] = downloads;
    if (!(initialDownload && replacementDownload && latestDownload)) throw new Error("Expected initial and repeated replacement downloads");
    const replacementToken = await createCapabilityToken({ capabilityId: replacementDownload._id, secret: CAPABILITY_SECRET });
    const latestToken = await createCapabilityToken({ capabilityId: latestDownload._id, secret: CAPABILITY_SECRET });

    const initialResponses = await Promise.all(
      [confirmation.downloadToken ?? "", replacementToken, latestToken].map(async (token) => {
        const response = await convex.fetch(`/newsletter/ebook?token=${token}`);
        return response.status;
      })
    );
    expect(initialResponses).toStrictEqual([200, 200, 200]);

    const initialExpiry = initialDownload._creationTime + 72 * 60 * 60 * 1000;
    const initialExpiryResults = await Promise.all(
      [confirmation.downloadToken ?? "", replacementToken, latestToken].map(
        async (token) => (await convex.run(async (ctx) => await resolveEbookIssuanceFromToken(ctx, { now: initialExpiry, token }))) !== null
      )
    );
    expect(initialExpiryResults).toStrictEqual([false, true, true]);

    const replacementExpiry = replacementDownload._creationTime + 72 * 60 * 60 * 1000;
    const replacementExpiryResults = await Promise.all(
      [replacementToken, latestToken].map(
        async (token) =>
          (await convex.run(async (ctx) => await resolveEbookIssuanceFromToken(ctx, { now: replacementExpiry, token }))) !== null
      )
    );
    expect(replacementExpiryResults).toStrictEqual([false, true]);

    const latestExpiry = latestDownload._creationTime + 72 * 60 * 60 * 1000;
    const latestExpiryResult = await convex.run(
      async (ctx) => await resolveEbookIssuanceFromToken(ctx, { now: latestExpiry, token: latestToken })
    );
    expect(latestExpiryResult).toBeNull();
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

    await expect(convex.mutation(api.newsletter.subscribe, createRequest())).resolves.toBeNull();
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
    await expect(convex.mutation(api.newsletter.subscribe, createRequest())).resolves.toBeNull();

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

  it("returns a terminal result for a permanent provider failure instead of retrying it", async () => {
    vi.stubEnv("LOOPS_API_KEY", "test-key");
    vi.stubEnv("LOOPS_CONFIRMATION_TRANSACTIONAL_ID", "confirmation-template");
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response("Invalid transactional ID", { status: 400 }));
    vi.stubGlobal("fetch", send);
    const convex = await createBackend();
    await convex.mutation(api.newsletter.subscribe, createRequest());
    const task = await convex.run(async (ctx) => await ctx.db.query("loopsTasks").unique());
    if (!task || task.kind !== "sendConfirmationEmail") throw new Error("Confirmation task was not found");

    await expect(convex.action(internal.loops.execute, { loopsTaskId: task._id })).resolves.toStrictEqual({
      failure: { failure: "validation", retryable: false },
      status: "failed",
    });
    expect(send).toHaveBeenCalledOnce();
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

    const firstFailure = await convex.action(internal.loops.execute, { loopsTaskId: task._id }).catch((error: unknown) => error);
    expect(getLoopsTaskFailure(firstFailure)).toStrictEqual({
      failure: "server",
      retryable: true,
    });
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
