import { createCapabilityToken } from "@ec/domain/helpers/capabilities";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import type { TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type schema from "./schema";
import { createBackend, createIdentity } from "./test.auth";

// Privacy fulfillment queues Loops work through the shared Workflow component.
vi.mock(import("@convex-dev/workflow"), async (importOriginal) => {
  const actual = await importOriginal();
  const workflowId = "test-workflow-id" as Awaited<ReturnType<typeof actual.start>>;
  return { ...actual, start: vi.fn<typeof actual.start>().mockResolvedValue(workflowId) } satisfies typeof actual;
});

const createSubscriber = async (convex: TestConvex<typeof schema>, email = "reader@example.com") =>
  await convex.run(async (ctx) => {
    const admin = await ctx.db
      .query("profiles")
      .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
      .unique();
    if (admin === null) throw new Error("Admin profile was not found");
    const profileId = await ctx.db.insert("profiles", { email, firstName: "Before", role: "contact" });
    const privacyNoticeId = await ctx.db.insert("legalTexts", {
      content: "Privacy",
      kind: "privacyNotice",
      publishedAt: 1,
      publishedBy: admin._id,
    });
    const newsletterConsentId = await ctx.db.insert("legalTexts", {
      content: "Consent",
      kind: "newsletterConsent",
      publishedAt: 1,
      publishedBy: admin._id,
    });
    const legalBundleId = await ctx.db.insert("newsletterLegalBundles", {
      newsletterConsentId,
      privacyNoticeId,
      publishedAt: 1,
      publishedBy: admin._id,
    });
    const subscriptionId = await ctx.db.insert("newsSubscriptions", {
      confirmedAt: 20,
      confirmedFrom: "email",
      legalBundleId,
      profileId,
      requestedAt: 10,
      unsubscribedAt: null,
    });
    return { profileId, subscriptionId };
  });

const verifyRequest = async (
  admin: Awaited<ReturnType<typeof createIdentity>>,
  requestKind: "access" | "erasure" | "export" | "objection" | "rectification" | "suppressionRemoval" | "unsubscription",
  email = "reader@example.com"
) =>
  await admin.mutation(api.privacy.recordVerification, {
    email,
    method: "emailChallenge",
    outcome: "completed",
    requestKind,
  });

describe("privacy administration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("does not expose a person's data to an unauthenticated requester", async () => {
    const convex = createBackend();

    await expect(convex.query(api.privacy.inspectSubject, { email: "reader@example.com" })).rejects.toThrow("Unauthenticated");
  });

  it("finds one person by canonical email", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await convex.run(async (ctx) => {
      await ctx.db.insert("profiles", { email: "reader@example.com", firstName: "Eliana", role: "contact" });
    });

    await expect(asAdmin.query(api.privacy.inspectSubject, { email: "  Reader@Example.COM " })).resolves.toMatchObject({
      profile: { email: "reader@example.com", firstName: "Eliana", role: "contact" },
    });
  });

  it("keeps consent, delivery eligibility, e-book history, and privacy state distinct", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await convex.run(async (ctx) => {
      const admin = await ctx.db
        .query("profiles")
        .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
        .unique();
      if (admin === null) throw new Error("Admin profile was not found");
      const profileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "Privacy",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: admin._id,
      });
      const newsletterConsentId = await ctx.db.insert("legalTexts", {
        content: "Consent",
        kind: "newsletterConsent",
        publishedAt: 1,
        publishedBy: admin._id,
      });
      const legalBundleId = await ctx.db.insert("newsletterLegalBundles", {
        newsletterConsentId,
        privacyNoticeId,
        publishedAt: 1,
        publishedBy: admin._id,
      });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 20,
        confirmedFrom: "email",
        legalBundleId,
        profileId,
        requestedAt: 10,
        unsubscribedAt: null,
      });
      await ctx.db.insert("newsRestrictions", {
        lastOccurredAt: 30,
        profileId,
        reason: "spamComplaint",
        resolvedAt: null,
        resolvedBy: null,
        restrictedAt: 30,
        restrictedBy: "provider",
        version: 1,
      });
      const storageId = await Promise.resolve(ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" })));
      const ebookId = await ctx.db.insert("ebooks", {
        fileName: "ebook.pdf",
        publishedAt: 5,
        publishedBy: admin._id,
        status: "published",
        storageId,
        title: "Carnet",
        updatedAt: 5,
        uploadedBy: admin._id,
        version: 1,
      });
      await ctx.db.insert("ebookIssuances", { ebookId, kind: "initial", profileId });
    });

    await expect(asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" })).resolves.toMatchObject({
      deliveryEligibility: {
        eligible: false,
        restriction: { reason: "spamComplaint", restrictedBy: "provider" },
        status: "restricted",
      },
      newsletterConsent: {
        periods: [{ confirmedAt: 20, requestedAt: 10, unsubscribedAt: null }],
      },
      privacyState: { suppressed: false },
      welcomeEbookAccess: {
        issuances: [{ ebook: { title: "Carnet", version: 1 }, kind: "initial" }],
      },
    });
  });

  it("returns null for an unknown canonical email", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    await expect(asAdmin.query(api.privacy.inspectSubject, { email: "missing@example.com" })).resolves.toBeNull();
  });

  it("finds a retained objection after identifying profile data has been erased", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const canonicalEmailHash = await hashCanonicalEmail({
      email: "erased@example.com",
      secret: "test-suppression-secret",
    });
    await convex.run(async (ctx) => {
      await ctx.db.insert("newsSuppressions", { canonicalEmailHash });
    });

    await expect(asAdmin.query(api.privacy.inspectSubject, { email: "erased@example.com" })).resolves.toStrictEqual({
      deliveryEligibility: { eligible: false, restriction: null, status: "suppressed" },
      newsletterConsent: { periods: [] },
      privacyState: { audits: [], grants: [], suppressed: true },
      profile: null,
      welcomeEbookAccess: { issuances: [] },
    });
  });

  it("shows the minimal privacy-operation history newest first", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const subjectHash = await hashCanonicalEmail({
      email: "reader@example.com",
      secret: "test-suppression-secret",
    });
    await convex.run(async (ctx) => {
      const performedBy = await ctx.db
        .query("profiles")
        .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
        .unique();
      if (performedBy === null) throw new Error("Admin profile was not found");
      await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      const accessVerificationAuditId = await ctx.db.insert("privacyAudits", {
        kind: "verification",
        method: "emailChallenge",
        outcome: "completed",
        performedBy: performedBy._id,
        requestKind: "access",
        subjectHash,
      });
      await ctx.db.insert("privacyAudits", {
        kind: "access",
        outcome: "completed",
        performedBy: performedBy._id,
        subjectHash,
        verificationAuditId: accessVerificationAuditId,
      });
      const erasureVerificationAuditId = await ctx.db.insert("privacyAudits", {
        kind: "verification",
        method: "emailChallenge",
        outcome: "completed",
        performedBy: performedBy._id,
        requestKind: "erasure",
        subjectHash,
      });
      await ctx.db.insert("privacyAudits", {
        kind: "erasure",
        outcome: "rejected",
        performedBy: performedBy._id,
        subjectHash,
        verificationAuditId: erasureVerificationAuditId,
      });
    });

    const person = await asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" });

    expect(person?.privacyState.audits.filter(({ kind }) => kind !== "verification")).toMatchObject([
      { kind: "erasure", outcome: "rejected" },
      { kind: "access", outcome: "completed" },
    ]);
    expect(person?.privacyState.audits[0]).not.toHaveProperty("subjectHash");
  });

  it("retains minimal audit history after identifying profile data is erased", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const subjectHash = await hashCanonicalEmail({
      email: "erased-without-objection@example.com",
      secret: "test-suppression-secret",
    });
    await convex.run(async (ctx) => {
      const performedBy = await ctx.db
        .query("profiles")
        .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
        .unique();
      if (performedBy === null) throw new Error("Admin profile was not found");
      const verificationAuditId = await ctx.db.insert("privacyAudits", {
        kind: "verification",
        method: "emailChallenge",
        outcome: "completed",
        performedBy: performedBy._id,
        requestKind: "erasure",
        subjectHash,
      });
      await ctx.db.insert("privacyAudits", {
        kind: "erasure",
        outcome: "completed",
        performedBy: performedBy._id,
        subjectHash,
        verificationAuditId,
      });
    });

    await expect(asAdmin.query(api.privacy.inspectSubject, { email: "erased-without-objection@example.com" })).resolves.toMatchObject({
      privacyState: {
        audits: [
          { kind: "erasure", outcome: "completed" },
          { kind: "verification", outcome: "completed", requestKind: "erasure" },
        ],
        suppressed: false,
      },
      profile: null,
    });
  });

  it("rejects an authenticated non-administrator", async () => {
    const convex = createBackend();
    const asMember = await createIdentity(convex, "member");

    await expect(asMember.query(api.privacy.inspectSubject, { email: "reader@example.com" })).rejects.toThrow("Unauthorized");
  });

  it("requires an explicit confirmation before a privacy mutation", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);

    await expect(
      asAdmin.mutation(api.privacy.fulfillRectificationRequest, {
        // @ts-expect-error -- exercise the runtime confirmation validator.
        confirmed: false,
        email: "reader@example.com",
        firstName: "After",
      })
    ).rejects.toThrow("Validator");
    await expect(asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" })).resolves.toMatchObject({
      privacyState: { audits: [] },
      profile: { firstName: "Before" },
    });
  });

  it("protects every privacy mutation from unauthenticated and non-administrator identities", async () => {
    const convex = createBackend();
    const asMember = await createIdentity(convex, "member");
    const payload = { confirmed: true as const, email: "reader@example.com" };
    const unauthenticated = [
      convex.mutation(api.privacy.fulfillAccessRequest, payload),
      convex.mutation(api.privacy.fulfillErasureRequest, payload),
      convex.mutation(api.privacy.fulfillExportRequest, payload),
      convex.mutation(api.privacy.fulfillObjectionRequest, payload),
      convex.mutation(api.privacy.fulfillRectificationRequest, { ...payload, firstName: "After" }),
      convex.mutation(api.privacy.fulfillSuppressionRemovalRequest, payload),
      convex.mutation(api.privacy.fulfillUnsubscriptionRequest, payload),
      convex.mutation(api.privacy.recordVerification, {
        email: payload.email,
        method: "emailChallenge",
        outcome: "completed",
        requestKind: "access",
      }),
    ];
    const unauthorized = [
      asMember.mutation(api.privacy.fulfillAccessRequest, payload),
      asMember.mutation(api.privacy.fulfillErasureRequest, payload),
      asMember.mutation(api.privacy.fulfillExportRequest, payload),
      asMember.mutation(api.privacy.fulfillObjectionRequest, payload),
      asMember.mutation(api.privacy.fulfillRectificationRequest, { ...payload, firstName: "After" }),
      asMember.mutation(api.privacy.fulfillSuppressionRemovalRequest, payload),
      asMember.mutation(api.privacy.fulfillUnsubscriptionRequest, payload),
      asMember.mutation(api.privacy.recordVerification, {
        email: payload.email,
        method: "emailChallenge",
        outcome: "completed",
        requestKind: "access",
      }),
    ];

    for (const result of unauthenticated) await expect(result).rejects.toThrow("Unauthenticated");
    for (const result of unauthorized) await expect(result).rejects.toThrow("Unauthorized");
  });

  it("records only the verification category, request kind, outcome, and administrator", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    await expect(
      asAdmin.mutation(api.privacy.recordVerification, {
        email: "reader@example.com",
        method: "emailChallenge",
        outcome: "completed",
        requestKind: "export",
      })
    ).resolves.toStrictEqual({ outcome: "completed" });
    const subject = await asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" });
    expect(subject?.privacyState.audits).toMatchObject([
      {
        kind: "verification",
        method: "emailChallenge",
        outcome: "completed",
        requestKind: "export",
      },
    ]);
  });

  it("records a rejected verification and rejects unsupported outcomes", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const verification = {
      email: "reader@example.com",
      method: "emailChallenge" as const,
      requestKind: "erasure" as const,
    };

    await expect(asAdmin.mutation(api.privacy.recordVerification, { ...verification, outcome: "rejected" })).resolves.toStrictEqual({
      outcome: "rejected",
    });
    await expect(
      asAdmin.mutation(api.privacy.recordVerification, {
        ...verification,
        // @ts-expect-error -- exercise the runtime outcome validator.
        outcome: "pending",
      })
    ).rejects.toThrow("Validator");
    await expect(asAdmin.query(api.privacy.inspectSubject, { email: verification.email })).resolves.toMatchObject({
      privacyState: { audits: [{ kind: "verification", outcome: "rejected", requestKind: "erasure" }] },
    });
  });

  it("requires and consumes one matching verification before fulfillment", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    const request = { confirmed: true as const, email: "reader@example.com" };

    await expect(asAdmin.mutation(api.privacy.fulfillAccessRequest, request)).rejects.toThrow("PRIVACY_GRANT_REQUIRED");
    await asAdmin.mutation(api.privacy.recordVerification, {
      email: request.email,
      method: "emailChallenge",
      outcome: "completed",
      requestKind: "access",
    });
    await expect(asAdmin.query(api.privacy.inspectSubject, { email: request.email })).resolves.toMatchObject({
      privacyState: { grants: [{ requestKind: "access" }] },
    });
    await expect(asAdmin.mutation(api.privacy.fulfillAccessRequest, request)).resolves.toMatchObject({ outcome: "completed" });
    await expect(asAdmin.query(api.privacy.inspectSubject, { email: request.email })).resolves.toMatchObject({
      privacyState: { grants: [] },
    });
    await expect(asAdmin.mutation(api.privacy.fulfillAccessRequest, request)).rejects.toThrow("PRIVACY_GRANT_REQUIRED");
  });

  it("does not authorize a different privacy-request kind", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    await verifyRequest(asAdmin, "access");

    await expect(asAdmin.mutation(api.privacy.fulfillExportRequest, { confirmed: true, email: "reader@example.com" })).rejects.toThrow(
      "PRIVACY_GRANT_REQUIRED"
    );
    await expect(
      asAdmin.mutation(api.privacy.fulfillAccessRequest, { confirmed: true, email: "reader@example.com" })
    ).resolves.toMatchObject({ outcome: "completed" });
  });

  it("links the fulfilled request audit to its verification audit", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    await verifyRequest(asAdmin, "access");
    await asAdmin.mutation(api.privacy.fulfillAccessRequest, { confirmed: true, email: "reader@example.com" });

    const subject = await asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" });
    const verificationAudit = subject?.privacyState.audits.find((audit) => audit.kind === "verification" && audit.requestKind === "access");
    const requestAudit = subject?.privacyState.audits.find((audit) => audit.kind === "access");
    if (requestAudit?.kind !== "access") throw new Error("Access audit was not found");
    expect(requestAudit.verificationAuditId).toBe(verificationAudit?._id);
  });

  it("revokes an active grant when a later verification is rejected", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    await verifyRequest(asAdmin, "erasure");
    await asAdmin.mutation(api.privacy.recordVerification, {
      email: "reader@example.com",
      method: "additionalEvidence",
      outcome: "rejected",
      requestKind: "erasure",
    });

    await expect(asAdmin.mutation(api.privacy.fulfillErasureRequest, { confirmed: true, email: "reader@example.com" })).rejects.toThrow(
      "PRIVACY_GRANT_REQUIRED"
    );
  });

  it("rejects an expired privacy grant", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    const now = Date.now();
    const dateNow = vi.spyOn(Date, "now").mockReturnValue(now);
    await verifyRequest(asAdmin, "rectification");
    dateNow.mockReturnValue(now + 30 * 60 * 1000 + 1);

    await expect(
      asAdmin.mutation(api.privacy.fulfillRectificationRequest, {
        confirmed: true,
        email: "reader@example.com",
        firstName: "After",
      })
    ).rejects.toThrow("PRIVACY_GRANT_REQUIRED");
  });

  it("audits confirmed access and export separately", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    await verifyRequest(asAdmin, "access");

    await expect(
      asAdmin.mutation(api.privacy.fulfillAccessRequest, { confirmed: true, email: "reader@example.com" })
    ).resolves.toMatchObject({
      data: { profile: { email: "reader@example.com" } },
      outcome: "completed",
    });
    await verifyRequest(asAdmin, "export");
    await expect(
      asAdmin.mutation(api.privacy.fulfillExportRequest, { confirmed: true, email: "reader@example.com" })
    ).resolves.toMatchObject({
      data: { profile: { email: "reader@example.com" } },
      outcome: "completed",
    });
    const person = await asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" });
    expect(person?.privacyState.audits.filter(({ kind }) => kind !== "verification").map(({ kind }) => kind)).toStrictEqual([
      "export",
      "access",
    ]);
  });

  it("does not turn rejected access audits into a known person", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await verifyRequest(asAdmin, "access", "unknown@example.com");

    await expect(
      asAdmin.mutation(api.privacy.fulfillAccessRequest, { confirmed: true, email: "unknown@example.com" })
    ).resolves.toStrictEqual({
      data: null,
      outcome: "rejected",
    });
    await verifyRequest(asAdmin, "access", "unknown@example.com");
    await expect(
      asAdmin.mutation(api.privacy.fulfillAccessRequest, { confirmed: true, email: "unknown@example.com" })
    ).resolves.toStrictEqual({
      data: null,
      outcome: "rejected",
    });
  });

  it("rectifies only the optional first name and records the administrator", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    await verifyRequest(asAdmin, "rectification");

    await expect(
      asAdmin.mutation(api.privacy.fulfillRectificationRequest, { confirmed: true, email: "reader@example.com", firstName: "After" })
    ).resolves.toStrictEqual({ outcome: "completed" });
    const person = await asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" });
    expect(person).toMatchObject({
      privacyState: {
        audits: [
          { kind: "rectification", outcome: "completed" },
          { kind: "verification", outcome: "completed", requestKind: "rectification" },
        ],
      },
      profile: { email: "reader@example.com", firstName: "After" },
    });
    expect(person?.privacyState.audits[0]?.performedBy).toBeDefined();
  });

  it("unsubscribes without removing Welcome E-book Access", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    await verifyRequest(asAdmin, "unsubscription");

    await expect(
      asAdmin.mutation(api.privacy.fulfillUnsubscriptionRequest, { confirmed: true, email: "reader@example.com" })
    ).resolves.toStrictEqual({
      outcome: "completed",
    });
    const person = await asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" });
    expect(person).toMatchObject({
      deliveryEligibility: { eligible: false, status: "notConsenting" },
      privacyState: {
        audits: [
          { kind: "unsubscription", outcome: "completed" },
          { kind: "verification", outcome: "completed", requestKind: "unsubscription" },
        ],
      },
    });
    expect(person?.newsletterConsent.periods[0]?.unsubscribedAt).toBeTypeOf("number");
  });

  it("records and lifts an objection without recreating consent", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createSubscriber(convex);
    await verifyRequest(asAdmin, "objection");

    await expect(
      asAdmin.mutation(api.privacy.fulfillObjectionRequest, { confirmed: true, email: "reader@example.com" })
    ).resolves.toStrictEqual({
      outcome: "completed",
    });
    await verifyRequest(asAdmin, "suppressionRemoval");
    await expect(
      asAdmin.mutation(api.privacy.fulfillSuppressionRemovalRequest, { confirmed: true, email: "reader@example.com" })
    ).resolves.toStrictEqual({
      outcome: "completed",
    });
    const person = await asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" });
    expect(person).toMatchObject({
      deliveryEligibility: { eligible: false, status: "notConsenting" },
      privacyState: {
        audits: [
          { kind: "suppressionRemoval", outcome: "completed" },
          { kind: "verification", outcome: "completed", requestKind: "suppressionRemoval" },
          { kind: "objection", outcome: "completed" },
          { kind: "verification", outcome: "completed", requestKind: "objection" },
        ],
        suppressed: false,
      },
    });
    expect(person?.newsletterConsent.periods[0]?.unsubscribedAt).toBeTypeOf("number");
  });

  it("erases identifying subscriber data and Welcome E-book Access while retaining the minimal audit", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const { profileId } = await createSubscriber(convex);
    await verifyRequest(asAdmin, "erasure");
    const ebookDownloadId = await convex.run(async (ctx) => {
      const admin = await ctx.db
        .query("profiles")
        .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
        .unique();
      if (admin === null) throw new Error("Admin profile was not found");
      const storageId = await Promise.resolve(ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" })));
      const ebookId = await ctx.db.insert("ebooks", {
        fileName: "ebook.pdf",
        publishedAt: 5,
        publishedBy: admin._id,
        status: "published",
        storageId,
        title: "Carnet",
        updatedAt: 5,
        uploadedBy: admin._id,
        version: 1,
      });
      const ebookIssuanceId = await ctx.db.insert("ebookIssuances", { ebookId, kind: "initial", profileId });
      return await ctx.db.insert("ebookDownloads", { ebookIssuanceId });
    });
    const ebookToken = await createCapabilityToken({ capabilityId: ebookDownloadId, secret: "test-capability-secret" });

    await expect(
      asAdmin.mutation(api.privacy.fulfillErasureRequest, { confirmed: true, email: "reader@example.com" })
    ).resolves.toStrictEqual({
      outcome: "completed",
    });
    await expect(asAdmin.query(api.privacy.inspectSubject, { email: "reader@example.com" })).resolves.toMatchObject({
      privacyState: {
        audits: [
          { kind: "erasure", outcome: "completed" },
          { kind: "verification", outcome: "completed", requestKind: "erasure" },
        ],
      },
      profile: null,
      welcomeEbookAccess: { issuances: [] },
    });
    const retained = await convex.run(async (ctx) => ({
      deleteTasks: await ctx.db
        .query("loopsTasks")
        .filter((q) => q.eq(q.field("kind"), "deleteContact"))
        .collect(),
      downloads: await ctx.db.query("ebookDownloads").collect(),
      issuances: await ctx.db.query("ebookIssuances").collect(),
      reader: await ctx.db
        .query("profiles")
        .withIndex("by_email", (query) => query.eq("email", "reader@example.com"))
        .unique(),
    }));
    expect(retained).toMatchObject({
      deleteTasks: [{ email: "reader@example.com", kind: "deleteContact" }],
      downloads: [],
      issuances: [],
      reader: null,
    });
    const erasedEbookResponse = await convex.fetch(`/newsletter/ebook?token=${ebookToken}`);
    expect({ location: erasedEbookResponse.headers.get("location"), status: erasedEbookResponse.status }).toStrictEqual({
      location: "https://www.elianacorre.com/newsletter/ebook",
      status: 302,
    });

    const [deleteTask] = retained.deleteTasks;
    if (!deleteTask) throw new Error("Delete-contact task was not found");
    await convex.mutation(internal.loops.markTaskSucceeded, { loopsTaskId: deleteTask._id });
    await expect(convex.run(async (ctx) => await ctx.db.get("loopsTasks", deleteTask._id))).resolves.toMatchObject({
      email: null,
      kind: "deleteContact",
      status: "succeeded",
    });
  });

  it("rejects subscriber erasure for a Profile with a member relationship", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await createIdentity(convex, "member");
    await verifyRequest(asAdmin, "erasure", "member@example.com");

    await expect(
      asAdmin.mutation(api.privacy.fulfillErasureRequest, { confirmed: true, email: "member@example.com" })
    ).resolves.toStrictEqual({
      outcome: "rejected",
    });
    await expect(asAdmin.query(api.privacy.inspectSubject, { email: "member@example.com" })).resolves.toMatchObject({
      privacyState: {
        audits: [
          { kind: "erasure", outcome: "rejected" },
          { kind: "verification", outcome: "completed", requestKind: "erasure" },
        ],
      },
      profile: { email: "member@example.com", role: "member" },
    });
  });
});
