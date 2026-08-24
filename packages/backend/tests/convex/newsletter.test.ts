import { Ref } from "@confect/core";
import { RegisteredConvexFunction } from "@confect/server";
import type { Id } from "@ec/backend/types";
import { PrivacyNoticeNotFound } from "@ec/domain/errors/legal-texts";
import { createCapabilityToken } from "@ec/domain/helpers/capabilities";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { TestConvex } from "convex-test";
import { Cause as C, Effect as E } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import refs from "../../confect/_generated/refs";
import databaseSchema from "../../confect/_generated/schema";
import { api, internal } from "../../convex/_generated/api";
import type schema from "../../convex/schema";
import { confirmNewsletter, isNewsletterConfirmationCurrent } from "../../features/newsletter";
import { createBackend } from "./test.auth";

vi.mock(import("@convex-dev/workflow"), async (importOriginal) => {
  const actual = await importOriginal();
  const workflowId = "test-workflow-id" as Awaited<ReturnType<typeof actual.start>>;
  return { ...actual, start: vi.fn<typeof actual.start>().mockResolvedValue(workflowId) } satisfies typeof actual;
});

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const NOW = Date.UTC(2026, 7, 23, 12);
const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
type Backend = TestConvex<typeof schema>;

const createNewsletterFixture = async (convex: Backend, { publishedEbook = true } = {}) =>
  await convex.run(async (ctx) => {
    const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
    const privacyNoticeId = await ctx.db.insert("legalTexts", {
      content: "Privacy",
      kind: "privacyNotice",
      publishedAt: NOW - 1000,
      publishedBy: adminId,
    });
    if (publishedEbook) {
      const storageId = await ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
      await ctx.db.insert("ebooks", {
        fileName: "welcome.pdf",
        publishedAt: NOW - 1000,
        publishedBy: adminId,
        status: "published",
        storageId,
        title: "Welcome",
        updatedAt: NOW - 1000,
        uploadedBy: adminId,
        version: 1,
      });
    }
    return privacyNoticeId;
  });

const subscriptionRequest = (privacyNoticeId: Id<"legalTexts">, email = "reader@example.com") => ({
  consent: true as const,
  email,
  firstName: "Reader",
  privacyNoticeId,
  website: "",
});

const subscribeThroughConfectEffect = (convex: Backend, args: Ref.Args<typeof refs.public.newsletter.subscribe>) =>
  Ref.runWithCodec(refs.public.newsletter.subscribe, args, async (functionReference, encodedArgs): Promise<unknown> => {
    const encodedReturns: unknown = await convex.mutation(functionReference, encodedArgs as never);
    return encodedReturns;
  });

const newsletterState = async (convex: Backend) =>
  await convex.run(async (ctx) => ({
    confirmations: await ctx.db.query("newsConfirmations").collect(),
    downloads: await ctx.db.query("ebookDownloads").collect(),
    issuances: await ctx.db.query("ebookIssuances").collect(),
    profiles: await ctx.db.query("profiles").collect(),
    restrictions: await ctx.db.query("newsRestrictions").collect(),
    subscriptions: await ctx.db.query("newsSubscriptions").collect(),
    tasks: await ctx.db.query("loopsTasks").collect(),
  }));

const createConfirmedSubscriber = async (
  convex: Backend,
  privacyNoticeId: Id<"legalTexts">,
  { email = "reader@example.com", restriction }: { email?: string; restriction?: "permanentBounce" | "spamComplaint" } = {}
) =>
  await convex.run(async (ctx) => {
    const profileId = await ctx.db.insert("profiles", { email, firstName: "Reader", role: "contact" });
    const subscriptionId = await ctx.db.insert("newsSubscriptions", {
      confirmedAt: NOW - 1000,
      confirmedFrom: "email",
      privacyNoticeId,
      profileId,
      requestedAt: NOW - 2000,
      unsubscribedAt: null,
    });
    const restrictionId = restriction
      ? await ctx.db.insert("newsRestrictions", {
          lastOccurredAt: NOW - 500,
          profileId,
          reason: restriction,
          resolvedAt: null,
          resolvedBy: null,
          restrictedAt: NOW - 500,
          restrictedBy: "provider",
          version: 1,
        })
      : null;
    return { profileId, restrictionId, subscriptionId };
  });

const confirmationToken = async (confirmationId: Id<"newsConfirmations">) =>
  await E.runPromise(createCapabilityToken({ capabilityId: confirmationId, secret: "test-capability-secret" }));

// TESTS -----------------------------------------------------------------------------------------------------------------------------------
describe("newsletter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("creates a pending subscription through the public Convex mutation", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);

    await expect(convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId))).resolves.toBeNull();

    const state = await newsletterState(convex);
    expect(state.profiles).toMatchObject([
      { email: "admin@example.com", role: "admin" },
      { email: "reader@example.com", firstName: "Reader", role: "contact" },
    ]);
    expect(state.subscriptions).toMatchObject([{ confirmedAt: null, privacyNoticeId, unsubscribedAt: null }]);
    expect(state.confirmations).toMatchObject([{ kind: "subscription", restrictionId: null, restrictionVersion: null }]);
    expect(state.tasks.filter(({ kind }) => kind === "sendConfirmationEmail")).toHaveLength(1);
  });

  it("canonicalizes the submitted email before lookup and persistence", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);

    await convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId, "  Reader@Example.COM "));

    await expect(
      convex.run(
        async (ctx) =>
          await ctx.db
            .query("profiles")
            .withIndex("by_email", (query) => query.eq("email", "reader@example.com"))
            .unique()
      )
    ).resolves.toMatchObject({ email: "reader@example.com" });
  });

  it("silently ignores the honeypot without consuming the request limit", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    const request = subscriptionRequest(privacyNoticeId);

    for (let attempt = 0; attempt < 5; attempt += 1)
      await convex.mutation(api.newsletter.subscribe, { ...request, website: "https://bot.example" });
    await convex.mutation(api.newsletter.subscribe, request);

    const state = await newsletterState(convex);
    expect(state.subscriptions).toHaveLength(1);
    expect(state.confirmations).toHaveLength(1);
  });

  it("does not recreate suppressed or permanently bounced contacts", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    const suppressedHash = await E.runPromise(hashCanonicalEmail({ email: "suppressed@example.com", secret: "test-suppression-secret" }));
    await convex.run(async (ctx) => {
      await ctx.db.insert("newsSuppressions", { canonicalEmailHash: suppressedHash });
    });
    await createConfirmedSubscriber(convex, privacyNoticeId, { email: "bounced@example.com", restriction: "permanentBounce" });

    await convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId, "suppressed@example.com"));
    await convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId, "bounced@example.com"));

    const state = await newsletterState(convex);
    expect(state.profiles.some(({ email }) => email === "suppressed@example.com")).toBeFalsy();
    expect(state.confirmations).toStrictEqual([]);
    expect(state.issuances).toStrictEqual([]);
  });

  it("transports PrivacyNoticeNotFound with its own Confect error tag", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    await convex.run(async (ctx) => {
      await ctx.db.delete(privacyNoticeId);
    });

    const exit = await E.runPromise(E.exit(subscribeThroughConfectEffect(convex, subscriptionRequest(privacyNoticeId))));

    if (exit._tag !== "Failure") throw new Error("Privacy notice lookup unexpectedly succeeded");
    const reason = exit.cause.reasons.find(C.isFailReason);
    if (!reason) throw new Error("Privacy notice failure was not transported in the typed error channel");
    expect(reason.error).toMatchObject({ _tag: "PrivacyNoticeNotFound" });
    expect(reason.error).toBeInstanceOf(PrivacyNoticeNotFound);
  });

  it("enforces both email and fallback-IP subscription limits", async () => {
    const emailLimited = createBackend();
    const noticeA = await createNewsletterFixture(emailLimited);
    for (let attempt = 0; attempt < 4; attempt += 1) await emailLimited.mutation(api.newsletter.subscribe, subscriptionRequest(noticeA));
    const emailLimitedState = await newsletterState(emailLimited);
    expect(emailLimitedState.tasks.filter(({ kind }) => kind === "sendConfirmationEmail")).toHaveLength(3);

    const ipLimited = createBackend();
    const noticeB = await createNewsletterFixture(ipLimited);
    for (const email of ["one@example.com", "two@example.com", "three@example.com", "four@example.com"])
      await ipLimited.mutation(api.newsletter.subscribe, subscriptionRequest(noticeB, email));
    const ipLimitedState = await newsletterState(ipLimited);
    expect(ipLimitedState.subscriptions).toHaveLength(3);
  });

  it("issues one replacement e-book for repeated confirmed-subscriber requests in the same window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    await createConfirmedSubscriber(convex, privacyNoticeId);
    const request = subscriptionRequest(privacyNoticeId);

    await convex.mutation(api.newsletter.subscribe, request);
    await convex.mutation(api.newsletter.subscribe, request);

    const state = await newsletterState(convex);
    expect(state.issuances).toMatchObject([{ kind: "replacement" }]);
    expect(state.downloads).toHaveLength(1);
    expect(state.tasks.filter(({ kind }) => kind === "sendEbookEmail")).toHaveLength(1);
  });

  it("charges confirmed-subscriber replacement requests to the fallback-IP limit", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    await createConfirmedSubscriber(convex, privacyNoticeId);
    const confirmedRequest = subscriptionRequest(privacyNoticeId);
    for (let attempt = 0; attempt < 3; attempt += 1) await convex.mutation(api.newsletter.subscribe, confirmedRequest);

    await convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId, "new-reader@example.com"));

    const state = await newsletterState(convex);
    expect(state).toMatchObject({
      issuances: [{ kind: "replacement" }],
      subscriptions: [{ confirmedAt: NOW - 1000 }],
    });
  });

  it("creates one reactivation confirmation for repeated restricted-subscriber requests", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    const { restrictionId } = await createConfirmedSubscriber(convex, privacyNoticeId, { restriction: "spamComplaint" });
    const request = subscriptionRequest(privacyNoticeId);

    await convex.mutation(api.newsletter.subscribe, request);
    await convex.mutation(api.newsletter.subscribe, request);

    const state = await newsletterState(convex);
    expect(state.confirmations).toMatchObject([{ kind: "reactivation", restrictionId, restrictionVersion: 1 }]);
    expect(state.tasks.filter(({ kind }) => kind === "sendConfirmationEmail")).toHaveLength(1);
    expect(state.issuances).toStrictEqual([]);
  });

  it("charges restricted-subscriber reactivation requests to the fallback-IP limit", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    await createConfirmedSubscriber(convex, privacyNoticeId, { restriction: "spamComplaint" });
    const restrictedRequest = subscriptionRequest(privacyNoticeId);
    for (let attempt = 0; attempt < 3; attempt += 1) await convex.mutation(api.newsletter.subscribe, restrictedRequest);

    await convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId, "new-reader@example.com"));

    const state = await newsletterState(convex);
    expect(state).toMatchObject({
      confirmations: [{ kind: "reactivation" }],
      subscriptions: [{ confirmedAt: NOW - 1000 }],
    });
  });

  it("rotates a pending subscription confirmation and makes the old delivery task harmless", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    const request = subscriptionRequest(privacyNoticeId);
    await convex.mutation(api.newsletter.subscribe, request);
    const firstState = await newsletterState(convex);
    const [firstConfirmation] = firstState.confirmations;
    if (!firstConfirmation) throw new Error("First confirmation was not created");

    await convex.mutation(api.newsletter.subscribe, request);
    const state = await newsletterState(convex);
    expect(state.confirmations).toHaveLength(1);
    expect(state.confirmations[0]?._id).not.toBe(firstConfirmation._id);
    const staleTask = state.tasks.find(
      (task) => task.kind === "sendConfirmationEmail" && task.newsConfirmationId === firstConfirmation._id
    );
    if (!staleTask) throw new Error("Stale confirmation task was not found");
    await expect(convex.query(internal.loops.getExecutionPayload, { loopsTaskId: staleTask._id })).resolves.toBeNull();
  });

  it("confirms a valid subscription once and issues the initial e-book", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    await convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId));
    const pendingState = await newsletterState(convex);
    const [confirmation] = pendingState.confirmations;
    if (!confirmation) throw new Error("Confirmation was not created");
    const token = await confirmationToken(confirmation._id);

    const first = await convex.mutation(api.newsletter.confirm, { token });
    const second = await convex.mutation(api.newsletter.confirm, { token });

    expect(first).toMatchObject({ confirmed: true });
    expect(first.downloadToken).toBeTypeOf("string");
    expect(second).toStrictEqual({ confirmed: false, downloadToken: null });
    const state = await newsletterState(convex);
    expect({ confirmations: state.confirmations, issuances: state.issuances, subscriptions: state.subscriptions }).toMatchObject({
      confirmations: [],
      issuances: [{ kind: "initial" }],
      subscriptions: [{ confirmedAt: NOW, confirmedFrom: "email" }],
    });
  });

  it("rejects invalid confirmations and treats the expiry boundary as expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    await expect(convex.mutation(api.newsletter.confirm, { token: "invalid" })).resolves.toStrictEqual({
      confirmed: false,
      downloadToken: null,
    });
    await convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId));
    const state = await newsletterState(convex);
    const [confirmation] = state.confirmations;
    if (!confirmation) throw new Error("Confirmation was not created");
    const token = await confirmationToken(confirmation._id);
    expect(isNewsletterConfirmationCurrent(confirmation._creationTime, confirmation._creationTime + CONFIRMATION_TTL_MS - 1)).toBeTruthy();
    expect(isNewsletterConfirmationCurrent(confirmation._creationTime, confirmation._creationTime + CONFIRMATION_TTL_MS)).toBeFalsy();
    const expired = await convex.run(
      async (ctx) =>
        await E.runPromise(
          confirmNewsletter({ now: confirmation._creationTime + CONFIRMATION_TTL_MS, token }).pipe(
            E.provide(RegisteredConvexFunction.mutationLayer(databaseSchema, ctx))
          )
        )
    );
    expect(expired.confirmed).toBeFalsy();
  });

  it("reactivates a spam-restricted confirmed subscriber and issues one replacement", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    await createConfirmedSubscriber(convex, privacyNoticeId, { restriction: "spamComplaint" });
    await convex.mutation(api.newsletter.subscribe, subscriptionRequest(privacyNoticeId));
    const pendingState = await newsletterState(convex);
    const [confirmation] = pendingState.confirmations;
    if (!confirmation) throw new Error("Reactivation confirmation was not created");
    const token = await confirmationToken(confirmation._id);

    await expect(convex.mutation(api.newsletter.confirm, { token })).resolves.toMatchObject({ confirmed: true });

    const state = await newsletterState(convex);
    expect(state.restrictions).toMatchObject([{ resolvedAt: NOW, resolvedBy: "confirmation" }]);
    expect(state.issuances).toMatchObject([{ kind: "replacement" }]);
    expect(state.issuances).toHaveLength(1);
  });

  it("records unsubscription and permanent bounce through authoritative webhook mutations", async () => {
    const convex = createBackend();
    const privacyNoticeId = await createNewsletterFixture(convex);
    await createConfirmedSubscriber(convex, privacyNoticeId);

    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.unsubscribed",
      messageId: "unsubscribe-message",
      occurredAt: NOW,
      webhookId: "unsubscribe-webhook",
    });
    await convex.mutation(internal.loops.processWebhook, {
      email: "reader@example.com",
      kind: "email.hardBounced",
      messageId: "bounce-message",
      occurredAt: NOW + 1,
      webhookId: "bounce-webhook",
    });

    const state = await newsletterState(convex);
    expect(state.subscriptions).toMatchObject([{ unsubscribedAt: NOW }]);
    expect(state.restrictions).toMatchObject([{ reason: "permanentBounce", restrictedAt: NOW + 1 }]);
  });
});
