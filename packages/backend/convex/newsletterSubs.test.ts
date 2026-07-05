import { register as registerAggregate } from "@convex-dev/aggregate/test";
import { register as registerLoops } from "@devwithbobby/loops/test";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import schema from "./schema";
import { modules } from "./test.setup";

const loopsModules = import.meta.glob("../node_modules/@devwithbobby/loops/src/component/**/*.ts");

const getLinkToken = (job: Doc<"emailProviderJobs"> | null | undefined): string | undefined =>
  job?.kind === "confirmation" || job?.kind === "ebook" ? job.linkToken : undefined;

const createBackend = async () => {
  const convex = convexTest(schema, modules);
  registerLoops(convex, "loops", loopsModules);
  registerAggregate(convex, "loops/contactAggregate");
  await convex.run(async (ctx) => {
    const publishedAt = Date.now();
    const publishedBy = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
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
      outbox: await ctx.db.query("emailProviderJobs").collect(),
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
    expect(state.outbox).toMatchObject([{ attempts: 0, kind: "confirmation", status: "pending" }]);
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
          .query("emailProviderJobs")
          .filter((query) => query.eq(query.field("kind"), "confirmation"))
          .collect()
    );

    await expect(
      convex.mutation(api.newsletterSubs.confirm, { token: getLinkToken(confirmationEmails[0]) ?? "missing" })
    ).resolves.toStrictEqual({ downloadToken: null, status: "invalid" });
    const confirmation = await convex.mutation(api.newsletterSubs.confirm, {
      token: getLinkToken(confirmationEmails[1]) ?? "missing",
    });
    expect({ downloadTokenType: typeof confirmation.downloadToken, status: confirmation.status }).toStrictEqual({
      downloadTokenType: "string",
      status: "confirmed",
    });
    if (confirmation.status !== "confirmed") throw new Error("Confirmation failed");

    const state = await convex.run(async (ctx) => ({
      capabilities: await ctx.db.query("ebookGrants").collect(),
      deliveries: await ctx.db
        .query("emailProviderJobs")
        .filter((query) => query.eq(query.field("kind"), "ebook"))
        .collect(),
      subscriptions: await ctx.db.query("newsletterSubs").collect(),
    }));
    expect(state).toMatchObject({
      capabilities: [{ profileId: state.subscriptions[0]?.profileId }],
      deliveries: [{ attempts: 0, kind: "ebook", status: "pending" }],
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
    expect({ repeatedConfirmation, subscriptionCountAfterRepeat }).toStrictEqual({
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
      const email = await ctx.db.query("emailProviderJobs").unique();
      return getLinkToken(email);
    });
    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

    await expect(convex.mutation(api.newsletterSubs.confirm, { token: token ?? "missing" })).resolves.toStrictEqual({
      downloadToken: null,
      status: "invalid",
    });
    await expect(
      convex.run(async (ctx) => ({
        capabilities: await ctx.db.query("ebookGrants").collect(),
        subscriptions: await ctx.db.query("newsletterSubs").collect(),
      }))
    ).resolves.toMatchObject({ capabilities: [], subscriptions: [{ confirmedAt: null }] });
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
      const email = await ctx.db.query("emailProviderJobs").unique();
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
      if (previous !== null) await ctx.db.patch(previous._id, { status: "archived", updatedAt: now });
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
      const email = await ctx.db.query("emailProviderJobs").unique();
      return getLinkToken(email);
    });
    await convex.mutation(api.newsletterSubs.confirm, { token: confirmationToken ?? "missing" });

    await expect(convex.mutation(api.newsletterSubs.upsert, request)).resolves.toStrictEqual({ accepted: true });

    const state = await convex.run(async (ctx) => ({
      capabilities: await ctx.db.query("ebookGrants").collect(),
      confirmationEmails: await ctx.db
        .query("emailProviderJobs")
        .filter((query) => query.eq(query.field("kind"), "confirmation"))
        .collect(),
      deliveryEmails: await ctx.db
        .query("emailProviderJobs")
        .filter((query) => query.eq(query.field("kind"), "ebook"))
        .collect(),
      subscriptions: await ctx.db.query("newsletterSubs").collect(),
    }));
    expect(state.confirmationEmails).toHaveLength(1);
    expect(state.subscriptions).toHaveLength(1);
    expect(state.deliveryEmails).toHaveLength(2);
    expect(state.capabilities).toHaveLength(2);
  });

  it("projects a confirmed subscriber into the Loops contacts component", async () => {
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
      const email = await ctx.db.query("emailProviderJobs").unique();
      return getLinkToken(email);
    });
    await convex.mutation(api.newsletterSubs.confirm, { token: confirmationToken ?? "missing" });
    const contactSyncJobId = await convex.run(async (ctx) => {
      const contactSync = await ctx.db
        .query("emailProviderJobs")
        .filter((query) => query.eq(query.field("kind"), "newsletter-contact-sync"))
        .unique();
      return contactSync?._id;
    });
    if (contactSyncJobId === undefined) throw new Error("Newsletter contact synchronization was not queued");

    await convex.action(internal.emailProviderRunner.run, { emailProviderJobId: contactSyncJobId });

    const contactSync = await convex.run(async (ctx) => await ctx.db.get("emailProviderJobs", contactSyncJobId));
    expect(contactSync).toMatchObject({ kind: "newsletter-contact-sync", lastError: null, status: "sent" });
    const contacts = await convex.query(components.loops.queries.listContacts, { limit: 10 });
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
    const send = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("Loops unavailable"))
      .mockResolvedValueOnce(Response.json({ id: "loops-contact" }));
    vi.stubGlobal("fetch", send);
    const convex = await createBackend();
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });
    const confirmationToken = await convex.run(async (ctx) => {
      const confirmation = await ctx.db
        .query("emailProviderJobs")
        .filter((query) => query.eq(query.field("kind"), "confirmation"))
        .unique();
      return getLinkToken(confirmation);
    });
    await convex.mutation(api.newsletterSubs.confirm, { token: confirmationToken ?? "missing" });
    const contactSyncJobId = await convex.run(async (ctx) => {
      const contactSync = await ctx.db
        .query("emailProviderJobs")
        .filter((query) => query.eq(query.field("kind"), "newsletter-contact-sync"))
        .unique();
      return contactSync?._id;
    });
    if (contactSyncJobId === undefined) throw new Error("Newsletter contact synchronization was not queued");

    await convex.action(internal.emailProviderRunner.run, { emailProviderJobId: contactSyncJobId });
    const pending = await convex.run(async (ctx) => await ctx.db.get("emailProviderJobs", contactSyncJobId));
    expect(pending).toMatchObject({ attempts: 1, lastError: "Loops unavailable", status: "pending" });

    vi.advanceTimersByTime(60_000);
    await convex.action(internal.emailProviderRunner.run, { emailProviderJobId: contactSyncJobId });

    const sent = await convex.run(async (ctx) => await ctx.db.get("emailProviderJobs", contactSyncJobId));
    expect(sent).toMatchObject({ attempts: 2, lastError: null, status: "sent" });
    expect(send).toHaveBeenCalledTimes(2);
    const contacts = await convex.query(components.loops.queries.listContacts, { limit: 10 });
    expect(contacts.contacts).toMatchObject([{ email: "reader@example.com", subscribed: true, userGroup: "newsletter" }]);
  });

  it("retries failed email work with backoff and prevents duplicate delivery claims", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T00:00:00Z"));
    const convex = await createBackend();
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });
    const emailProviderJobId = await convex.run(async (ctx) => {
      const email = await ctx.db.query("emailProviderJobs").unique();
      return email?._id;
    });
    if (emailProviderJobId === undefined) throw new Error("Email work was not queued");

    const firstClaim = await convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId });
    const duplicateClaim = await convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId });
    expect({ duplicateClaim, idempotencyKeyType: typeof firstClaim?.job.idempotencyKey, kind: firstClaim?.job.kind }).toStrictEqual({
      duplicateClaim: null,
      idempotencyKeyType: "string",
      kind: "confirmation",
    });
    await convex.mutation(internal.emailProviderJobs.recordSendFailure, {
      attempt: firstClaim?.job.attempts ?? 0,
      emailProviderJobId,
      error: "Loops unavailable",
    });
    await expect(convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId })).resolves.toBeNull();

    vi.advanceTimersByTime(60_000);
    const retryClaim = await convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId });
    expect(retryClaim?.job.attempts).toBe(2);
    await convex.mutation(internal.emailProviderJobs.recordSendSuccess, { attempt: retryClaim?.job.attempts ?? 0, emailProviderJobId });
    const finalClaim = await convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId });
    const sentEmail = await convex.run(async (ctx) => await ctx.db.get("emailProviderJobs", emailProviderJobId));
    expect({ attempts: sentEmail?.attempts, finalClaim, sentAtType: typeof sentEmail?.sentAt, status: sentEmail?.status }).toStrictEqual({
      attempts: 2,
      finalClaim: null,
      sentAtType: "number",
      status: "sent",
    });
  });

  it("reclaims abandoned email work after its delivery lease expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T00:00:00Z"));
    const convex = await createBackend();
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });
    const emailProviderJobId = await convex.run(async (ctx) => {
      const email = await ctx.db.query("emailProviderJobs").unique();
      return email?._id;
    });
    if (emailProviderJobId === undefined) throw new Error("Email work was not queued");

    const abandonedClaim = await convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId });
    expect(abandonedClaim?.job.attempts).toBe(1);

    vi.advanceTimersByTime(5 * 60 * 1000);
    const recoveredClaim = await convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId });
    expect(recoveredClaim?.job.attempts).toBe(2);

    await convex.mutation(internal.emailProviderJobs.recordSendSuccess, { attempt: abandonedClaim?.job.attempts ?? 0, emailProviderJobId });
    const stillSending = await convex.run(async (ctx) => await ctx.db.get("emailProviderJobs", emailProviderJobId));
    expect(stillSending?.status).toBe("sending");

    await convex.mutation(internal.emailProviderJobs.recordSendSuccess, { attempt: recoveredClaim?.job.attempts ?? 0, emailProviderJobId });
    const sent = await convex.run(async (ctx) => await ctx.db.get("emailProviderJobs", emailProviderJobId));
    expect(sent).toMatchObject({ attempts: 2, leaseExpiresAt: null, status: "sent" });
  });

  it("automatically recovers an abandoned delivery claim", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T00:00:00Z"));
    vi.stubEnv("LOOPS_API_KEY", "test-key");
    vi.stubEnv("LOOPS_CONFIRMATION_TRANSACTIONAL_ID", "confirmation-template");
    vi.stubEnv("LOOPS_EBOOK_TRANSACTIONAL_ID", "ebook-template");
    vi.stubEnv("SITE_URL", "https://staging.elianacorre.com");
    const send = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", send);
    const convex = await createBackend();
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });
    const outboxId = await convex.run(async (ctx) => {
      const email = await ctx.db.query("emailProviderJobs").unique();
      return email?._id;
    });
    if (outboxId === undefined) throw new Error("Email work was not queued");

    await convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId: outboxId });
    vi.advanceTimersByTime(5 * 60 * 1000);
    await convex.action(internal.emailProviderRunner.run, { emailProviderJobId: outboxId });

    const sent = await convex.run(async (ctx) => await ctx.db.get("emailProviderJobs", outboxId));
    expect(sent).toMatchObject({ attempts: 2, leaseExpiresAt: null, status: "sent" });
    expect(send).toHaveBeenCalledOnce();
  });

  it("stops reclaiming abandoned delivery work at the attempt limit", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T00:00:00Z"));
    const convex = await createBackend();
    await convex.mutation(api.newsletterSubs.upsert, {
      consent: true,
      email: "reader@example.com",
    });
    const outboxId = await convex.run(async (ctx) => {
      const email = await ctx.db.query("emailProviderJobs").unique();
      return email?._id;
    });
    if (outboxId === undefined) throw new Error("Email work was not queued");

    await convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId: outboxId });
    await convex.run(async (ctx) => {
      await ctx.db.patch("emailProviderJobs", outboxId, {
        attempts: 8,
        leaseExpiresAt: Date.now() - 1,
      });
    });

    await expect(convex.mutation(internal.emailProviderJobs.claim, { emailProviderJobId: outboxId })).resolves.toBeNull();
    const failed = await convex.run(async (ctx) => await ctx.db.get("emailProviderJobs", outboxId));
    expect(failed).toMatchObject({ attempts: 8, leaseExpiresAt: null, status: "failed" });
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
    await convex.finishAllScheduledFunctions(vi.runAllTimers);

    expect(send).toHaveBeenCalledTimes(2);
    const firstHeaders = new Headers(send.mock.calls[0]?.[1]?.headers);
    const secondHeaders = new Headers(send.mock.calls[1]?.[1]?.headers);
    expect(firstHeaders.get("Idempotency-Key")).toBeTruthy();
    expect(secondHeaders.get("Idempotency-Key")).toBe(firstHeaders.get("Idempotency-Key"));
    const state = await convex.run(async (ctx) => ({
      outbox: await ctx.db.query("emailProviderJobs").unique(),
      subscription: await ctx.db.query("newsletterSubs").unique(),
    }));
    expect(state).toMatchObject({
      outbox: { attempts: 2, status: "sent" },
      subscription: { confirmedAt: null, unsubscribedAt: null },
    });
    expect(state.outbox?.sentAt).toBeTypeOf("number");
  });
});
