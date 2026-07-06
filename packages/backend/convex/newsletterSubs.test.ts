import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerLoops } from "@devwithbobby/loops/test";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

vi.mock(import("@convex-dev/workflow"), async (importOriginal) => {
  const actual = await importOriginal();

  const workflowId = "test-workflow-id" as Awaited<ReturnType<typeof actual.start>>;
  const start = vi.fn<typeof actual.start>().mockResolvedValue(workflowId);

  return {
    ...actual,
    start,
  } satisfies typeof actual;
});

const loopsModules = import.meta.glob("../node_modules/@devwithbobby/loops/src/component/**/*.ts");

const getLinkToken = (job: Doc<"loopsTasks"> | null | undefined): string | undefined =>
  job?.kind === "sendConfirmationEmail" || job?.kind === "sendEbookEmail" ? job.linkToken : undefined;

const createBackend = async () => {
  const convex = convexTest(schema, modules);
  registerLoops(convex, "loops", loopsModules);
  registerAggregate(convex, "loops/contactAggregate");
  await convex.run(async (ctx) => {
    const publishedAt = Date.now();
    const publishedBy = await ctx.db.insert("profiles", {
      email: "admin@example.com",
      role: "admin",
    });
    const privacyNoticeId = await ctx.db.insert("legalTexts", {
      content: "it's private",
      kind: "privacy-notice",
      publishedAt,
      publishedBy,
    });
    const newsletterConsentId = await ctx.db.insert("legalTexts", {
      content: "it's consent",
      kind: "newsletter-consent",
      publishedAt,
      publishedBy,
    });
    await ctx.db.insert("newsletterLegalBundles", {
      newsletterConsentId,
      privacyNoticeId,
      publishedAt,
      publishedBy,
    });
  });
  return convex;
};

const publishEbook = async (convex: TestConvex<typeof schema>) =>
  await convex.run(async (ctx) => {
    const now = Date.now();
    const admin = await ctx.db
      .query("profiles")
      .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
      .unique();
    if (admin === null) throw new Error("Admin profile was not found");
    const profileId = admin._id;
    const storageId = await Promise.resolve(ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" })));
    return await ctx.db.insert("ebooks", {
      fileName: "welcome.pdf",
      publishedAt: now,
      publishedBy: profileId,
      status: "published",
      storageId,
      title: "Welcome",
      updatedAt: now,
      uploadedBy: profileId,
      version: 1,
    });
  });

describe("newsletter subscription", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("records an unconfirmed request and queues confirmation", async () => {
    const convex = await createBackend();

    await expect(
      convex.mutation(api.newsletterSubs.upsert, {
        consent: true,
        email: "  Reader+Carnet@Example.COM ",
        firstName: "  Ada  ",
      })
    ).resolves.toStrictEqual({ accepted: true });

    const state = await convex.run(async (ctx) => ({
      bundles: await ctx.db.query("newsletterLegalBundles").collect(),
      documents: await ctx.db.query("legalTexts").collect(),
      outbox: await ctx.db.query("loopsTasks").collect(),
      profiles: await ctx.db.query("profiles").collect(),
      subscriptions: await ctx.db.query("newsletterSubs").collect(),
    }));
    const consentDocument = state.documents.find(({ kind }) => kind === "newsletter-consent");
    const privacyDocument = state.documents.find(({ kind }) => kind === "privacy-notice");

    expect(state.profiles).toMatchObject([
      {
        email: "admin@example.com",
        role: "admin",
      },
      {
        email: "reader+carnet@example.com",
        firstName: "Ada",
        role: "contact",
      },
    ]);
    expect(state.subscriptions).toMatchObject([
      {
        confirmedAt: null,
        legalBundleId: state.bundles[0]?._id,
        unsubscribedAt: null,
      },
    ]);
    expect({
      bundle: state.bundles[0],
      consentPublishedAtType: typeof consentDocument?.publishedAt,
      hasConsentDocument: state.documents.some(({ kind }) => kind === "newsletter-consent"),
      hasPrivacyDocument: state.documents.some(({ kind }) => kind === "privacy-notice"),
      privacyPublishedAtType: typeof privacyDocument?.publishedAt,
    }).toMatchObject({
      bundle: {
        newsletterConsentId: consentDocument?._id,
        privacyNoticeId: privacyDocument?._id,
      },
      consentPublishedAtType: "number",
      hasConsentDocument: true,
      hasPrivacyDocument: true,
      privacyPublishedAtType: "number",
    });
    expect(state.outbox).toMatchObject([{ kind: "sendConfirmationEmail", status: "pending" }]);
  });

  it("does not modify an existing profile when its email requests the newsletter", async () => {
    const convex = await createBackend();
    const profileId = await convex.run(async (ctx) => {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
        .unique();
      if (profile === null) throw new Error("Admin profile was not found");
      return profile._id;
    });

    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: " ADMIN@EXAMPLE.COM ",
      firstName: "Ada",
    });

    const profile = await convex.run(async (ctx) => await ctx.db.get("profiles", profileId));
    expect(profile).toMatchObject({
      email: "admin@example.com",
      role: "admin",
    });
    expect(profile?.firstName).toBeUndefined();
  });

  it("allows only the newest pending token to confirm consent and grant e-book access", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    const request = { consent: true, email: "reader@example.com" } as const;

    await convex.mutation(api.newsletterSubs.upsert, request);
    await convex.mutation(api.newsletterSubs.upsert, request);
    const confirmationEmails = await convex.run(
      async (ctx) =>
        await ctx.db
          .query("loopsTasks")
          .filter((query) => query.eq(query.field("kind"), "sendConfirmationEmail"))
          .collect()
    );

    await expect(
      convex.mutation(api.newsletterSubs.confirm, {
        token: getLinkToken(confirmationEmails[0]) ?? "missing",
      })
    ).resolves.toStrictEqual({ downloadToken: null, status: "invalid" });
    const confirmation = await convex.mutation(api.newsletterSubs.confirm, {
      token: getLinkToken(confirmationEmails[1]) ?? "missing",
    });
    expect({
      downloadTokenType: typeof confirmation.downloadToken,
      status: confirmation.status,
    }).toStrictEqual({
      downloadTokenType: "string",
      status: "confirmed",
    });
    if (confirmation.status !== "confirmed") throw new Error("Confirmation failed");

    const state = await convex.run(async (ctx) => ({
      capabilities: await ctx.db.query("ebookGrants").collect(),
      deliveries: await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "sendEbookEmail"))
        .collect(),
      subscriptions: await ctx.db.query("newsletterSubs").collect(),
    }));
    expect(state).toMatchObject({
      capabilities: [{ profileId: state.subscriptions[0]?.profileId }],
      deliveries: [{ kind: "sendEbookEmail", status: "pending" }],
      subscriptions: [{ confirmTokenHash: null }],
    });
    expect(state.subscriptions.map(({ confirmedAt, legalBundleId }) => [typeof confirmedAt, typeof legalBundleId])).toStrictEqual([
      ["number", "string"],
    ]);

    const repeatedConfirmation = await convex.mutation(api.newsletterSubs.confirm, {
      token: getLinkToken(confirmationEmails[1]) ?? "missing",
    });
    const subscriptionCountAfterRepeat = await convex.run(async (ctx) => {
      const subscriptions = await ctx.db.query("newsletterSubs").collect();
      return subscriptions.length;
    });
    expect({
      repeatedConfirmation,
      subscriptionCountAfterRepeat,
    }).toStrictEqual({
      repeatedConfirmation: { downloadToken: null, status: "invalid" },
      subscriptionCountAfterRepeat: 1,
    });
  });

  it("rejects an expired confirmation token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T00:00:00Z"));
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });
    const token = await convex.run(async (ctx) => {
      const email = await ctx.db.query("loopsTasks").unique();
      return getLinkToken(email);
    });
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    await expect(
      convex.mutation(api.newsletterSubs.confirm, {
        token: token ?? "missing",
      })
    ).resolves.toStrictEqual({
      downloadToken: null,
      status: "invalid",
    });
    await expect(
      convex.run(async (ctx) => ({
        capabilities: await ctx.db.query("ebookGrants").collect(),
        subscriptions: await ctx.db.query("newsletterSubs").collect(),
      }))
    ).resolves.toMatchObject({
      capabilities: [],
      subscriptions: [{ confirmedAt: null }],
    });
  });

  it("serves the latest e-book only while the personal capability is valid", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T00:00:00Z"));
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });
    const confirmationToken = await convex.run(async (ctx) => {
      const email = await ctx.db.query("loopsTasks").unique();
      return getLinkToken(email);
    });
    const confirmation = await convex.mutation(api.newsletterSubs.confirm, {
      token: confirmationToken ?? "missing",
    });
    if (confirmation.status !== "confirmed") throw new Error("Confirmation failed");
    await convex.run(async (ctx) => {
      const now = Date.now();
      const admin = await ctx.db
        .query("profiles")
        .withIndex("by_role", (query) => query.eq("role", "admin"))
        .unique();
      if (admin === null) throw new Error("Admin profile was not found");
      const storageId = await Promise.resolve(ctx.storage.store(new Blob(["%PDF-2.0"], { type: "application/pdf" })));
      const previous = await ctx.db
        .query("ebooks")
        .withIndex("by_status", (query) => query.eq("status", "published"))
        .unique();
      if (previous !== null)
        await ctx.db.patch(previous._id, {
          status: "archived",
          updatedAt: now,
        });
      await ctx.db.insert("ebooks", {
        fileName: "latest.pdf",
        publishedAt: now,
        publishedBy: admin._id,
        status: "published",
        storageId,
        title: "Latest",
        updatedAt: now,
        uploadedBy: admin._id,
        version: 2,
      });
    });

    const download = await convex.fetch(`/newsletter/ebook?token=${confirmation.downloadToken}`);
    expect(download.status).toBe(200);
    await expect(download.text()).resolves.toBe("%PDF-2.0");

    vi.advanceTimersByTime(72 * 60 * 60 * 1000 + 1);
    await expect(convex.fetch(`/newsletter/ebook?token=${confirmation.downloadToken}`)).resolves.toMatchObject({ status: 404 });
  });

  it("queues a fresh e-book capability instead of another confirmation for an active subscriber", async () => {
    const convex = await createBackend();
    await publishEbook(convex);
    const request = { consent: true, email: "reader@example.com" } as const;
    await convex.mutation(api.newsletterSubs.upsert, request);
    const confirmationToken = await convex.run(async (ctx) => {
      const email = await ctx.db.query("loopsTasks").unique();
      return getLinkToken(email);
    });
    await convex.mutation(api.newsletterSubs.confirm, {
      token: confirmationToken ?? "missing",
    });

    await expect(convex.mutation(api.newsletterSubs.upsert, request)).resolves.toStrictEqual({ accepted: true });

    const state = await convex.run(async (ctx) => ({
      capabilities: await ctx.db.query("ebookGrants").collect(),
      confirmationEmails: await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "sendConfirmationEmail"))
        .collect(),
      deliveryEmails: await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "sendEbookEmail"))
        .collect(),
      subscriptions: await ctx.db.query("newsletterSubs").collect(),
    }));
    expect(state.confirmationEmails).toHaveLength(1);
    expect(state.subscriptions).toHaveLength(1);
    expect(state.deliveryEmails).toHaveLength(2);
    expect(state.capabilities).toHaveLength(2);
  });

  it("projects a confirmed subscriber into the Loops contacts component", async () => {
    vi.useFakeTimers();
    vi.stubEnv("LOOPS_API_KEY", "test-key");
    vi.stubEnv("LOOPS_CONFIRMATION_TRANSACTIONAL_ID", "confirmation-template");
    vi.stubEnv("LOOPS_EBOOK_TRANSACTIONAL_ID", "ebook-template");
    vi.stubEnv("SITE_URL", "https://staging.elianacorre.com");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (input) => {
        let url: string;
        if (typeof input === "string") url = input;
        else if (input instanceof URL) url = input.href;
        else ({ url } = input);
        return await Promise.resolve(
          url.endsWith("/contacts/create") ? Response.json({ id: "loops-contact" }) : Response.json({ messageId: "loops-message" })
        );
      })
    );
    const convex = await createBackend();
    await publishEbook(convex);
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
      firstName: "Ada",
    });
    const confirmationToken = await convex.run(async (ctx) => {
      const email = await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "sendConfirmationEmail"))
        .unique();
      return getLinkToken(email);
    });
    await convex.mutation(api.newsletterSubs.confirm, {
      token: confirmationToken ?? "missing",
    });
    const contactSyncJobId = await convex.run(async (ctx) => {
      const contactSync = await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "syncContact"))
        .unique();
      return contactSync?._id;
    });
    if (contactSyncJobId === undefined) throw new Error("Newsletter contact synchronization was not queued");

    await convex.action(internal.loops.execute, {
      loopsTaskId: contactSyncJobId,
    });
    await convex.mutation(internal.loops.markTaskSucceeded, {
      loopsTaskId: contactSyncJobId,
    });

    const contactSync = await convex.run(async (ctx) => await ctx.db.get("loopsTasks", contactSyncJobId));
    expect(contactSync).toMatchObject({
      error: null,
      kind: "syncContact",
      status: "succeeded",
    });
    const contacts = await convex.query(components.loops.queries.listContacts, {
      limit: 10,
    });
    expect(contacts.contacts).toMatchObject([
      {
        email: "reader@example.com",
        firstName: "Ada",
        source: "elianacorre.com",
        subscribed: true,
        userGroup: "newsletter",
      },
    ]);
    expect(contacts.contacts[0]?.userId).toStrictEqual(expect.any(String));
  });

  it("retries newsletter contact synchronization after a provider outage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T00:00:00Z"));
    vi.stubEnv("LOOPS_API_KEY", "test-key");
    vi.stubEnv("LOOPS_CONFIRMATION_TRANSACTIONAL_ID", "confirmation-template");
    vi.stubEnv("LOOPS_EBOOK_TRANSACTIONAL_ID", "ebook-template");
    vi.stubEnv("SITE_URL", "https://staging.elianacorre.com");

    let contactAttempts = 0;
    // oxlint-disable-next-line require-await
    const send = vi.fn<typeof fetch>(async (input) => {
      let url: string;
      if (typeof input === "string") url = input;
      else if (input instanceof URL) url = input.href;
      else ({ url } = input);

      if (url.endsWith("/contacts/create")) {
        contactAttempts += 1;
        if (contactAttempts === 1) throw new Error("Loops unavailable");
        return Response.json({ id: "loops-contact" });
      }

      return Response.json({ messageId: "loops-message" });
    });
    vi.stubGlobal("fetch", send);

    const convex = await createBackend();
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });
    const confirmationToken = await convex.run(async (ctx) => {
      const confirmation = await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "sendConfirmationEmail"))
        .unique();
      return getLinkToken(confirmation);
    });
    await convex.mutation(api.newsletterSubs.confirm, {
      token: confirmationToken ?? "missing",
    });
    const contactSyncJobId = await convex.run(async (ctx) => {
      const contactSync = await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "syncContact"))
        .unique();
      return contactSync?._id;
    });
    if (contactSyncJobId === undefined) throw new Error("Newsletter contact synchronization was not queued");

    await expect(convex.action(internal.loops.execute, { loopsTaskId: contactSyncJobId })).rejects.toThrow("Loops unavailable");

    const pending = await convex.run(async (ctx) => await ctx.db.get("loopsTasks", contactSyncJobId));
    expect(pending).toMatchObject({
      kind: "syncContact",
      status: "pending",
    });

    await convex.action(internal.loops.execute, {
      loopsTaskId: contactSyncJobId,
    });
    await convex.mutation(internal.loops.markTaskSucceeded, {
      loopsTaskId: contactSyncJobId,
    });

    const sent = await convex.run(async (ctx) => await ctx.db.get("loopsTasks", contactSyncJobId));
    expect(sent).toMatchObject({
      error: null,
      kind: "syncContact",
      status: "succeeded",
    });
    expect(contactAttempts).toBe(2);
    const contacts = await convex.query(components.loops.queries.listContacts, {
      limit: 10,
    });
    expect(contacts.contacts).toMatchObject([
      {
        email: "reader@example.com",
        subscribed: true,
        userGroup: "newsletter",
      },
    ]);
  });

  it("retains subscription state through a Loops outage and retries with one idempotency key", async () => {
    vi.useFakeTimers();
    vi.stubEnv("LOOPS_API_KEY", "test-key");
    vi.stubEnv("LOOPS_CONFIRMATION_TRANSACTIONAL_ID", "confirmation-template");
    vi.stubEnv("LOOPS_EBOOK_TRANSACTIONAL_ID", "ebook-template");
    vi.stubEnv("SITE_URL", "https://staging.elianacorre.com");
    const send = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ success: true }));
    vi.stubGlobal("fetch", send);
    const convex = await createBackend();

    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });

    const confirmationTaskId = await convex.run(async (ctx) => {
      const task = await ctx.db
        .query("loopsTasks")
        .filter((query) => query.eq(query.field("kind"), "sendConfirmationEmail"))
        .unique();
      return task?._id;
    });
    if (confirmationTaskId === undefined) throw new Error("Confirmation Loops task was not queued");

    await expect(
      convex.action(internal.loops.execute, {
        loopsTaskId: confirmationTaskId,
      })
    ).rejects.toThrow("Loops service error. Please try again later.");
    await convex.action(internal.loops.execute, {
      loopsTaskId: confirmationTaskId,
    });

    await convex.mutation(internal.loops.markTaskSucceeded, {
      loopsTaskId: confirmationTaskId,
    });

    const firstIdempotencyKey = new Headers(send.mock.calls[0]?.[1]?.headers).get("Idempotency-Key");
    const secondIdempotencyKey = new Headers(send.mock.calls[1]?.[1]?.headers).get("Idempotency-Key");

    const state = await convex.run(async (ctx) => ({
      outbox: await ctx.db.query("loopsTasks").unique(),
      subscription: await ctx.db.query("newsletterSubs").unique(),
    }));

    expect({
      callCount: send.mock.calls.length,
      firstIdempotencyKeyType: typeof firstIdempotencyKey,
      outboxStatus: state.outbox?.status,
      sameIdempotencyKey: secondIdempotencyKey === firstIdempotencyKey,
      subscriptionConfirmedAt: state.subscription?.confirmedAt,
      subscriptionUnsubscribedAt: state.subscription?.unsubscribedAt,
      succeededAtType: typeof state.outbox?.succeededAt,
    }).toStrictEqual({
      callCount: 2,
      firstIdempotencyKeyType: "string",
      outboxStatus: "succeeded",
      sameIdempotencyKey: true,
      subscriptionConfirmedAt: null,
      subscriptionUnsubscribedAt: null,
      succeededAtType: "number",
    });
  });
});
