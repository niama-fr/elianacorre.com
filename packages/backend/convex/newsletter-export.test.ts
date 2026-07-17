import { afterEach, describe, expect, it, vi } from "vitest";

import { api } from "./_generated/api";
import { createBackend, createIdentity } from "./test.auth";

describe("newsletter portability export", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("is available only to administrators", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const asMember = await createIdentity(convex, "member");

    await expect(convex.query(api.newsletter.exportData, { format: "json" })).rejects.toThrow("Unauthenticated");
    await expect(asMember.query(api.newsletter.exportData, { format: "csv" })).rejects.toThrow("Unauthorized");
    await expect(asAdmin.query(api.newsletter.exportData, { format: "json" })).resolves.toMatchObject({
      contentType: "application/json",
    });
  });

  it("exports reconstructable provider-independent state without capabilities or technical logs", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const seeded = await convex.run(async (ctx) => {
      const admin = await ctx.db
        .query("profiles")
        .withIndex("by_email", (query) => query.eq("email", "admin@example.com"))
        .unique();
      if (!admin) throw new Error("Admin profile was not found");
      const profileId = await ctx.db.insert("profiles", { email: "reader@example.com", firstName: "Reader", role: "member" });
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
        legalBundleId,
        profileId,
        requestedAt: 10,
        unsubscribedAt: null,
      });
      const storageId = await ctx.storage.store(new Blob(["book"]));
      const ebookId = await ctx.db.insert("ebooks", {
        fileName: "book.pdf",
        publishedAt: 1,
        publishedBy: admin._id,
        status: "published",
        storageId,
        title: "Book",
        updatedAt: 1,
        uploadedBy: admin._id,
        version: 1,
      });
      await ctx.db.insert("ebookIssuances", { ebookId, kind: "initial", profileId });
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
      await ctx.db.insert("newsSuppressions", { canonicalEmailHash: "minimum-objection-hash" });
      await ctx.db.insert("loopsTasks", {
        acknowledgedAt: null,
        email: "technical@example.com",
        failure: "unknown",
        finishedAt: 1,
        idempotencyKey: "secret-idempotency-key",
        kind: "deleteContact",
        replayCount: 0,
        status: "failed",
        workflowIds: ["secret-workflow-id"],
      });
      await ctx.db.insert("loopsWebhooks", {
        email: "technical@example.com",
        kind: "email.hardBounced",
        messageId: "secret-message-id",
        occurredAt: 1,
        webhookId: "secret-webhook-id",
      });
      return { ebookId, legalBundleId };
    });

    const result = {
      csv: await asAdmin.query(api.newsletter.exportData, { format: "csv" }),
      json: await asAdmin.query(api.newsletter.exportData, { format: "json" }),
    };

    expect({
      csvHasEligibility: result.csv.content.includes('""eligible"":false') && result.csv.content.includes('""restricted"":true'),
      csvHasPersonAndSuppression: result.csv.content.includes("reader@example.com") && result.csv.content.includes('"suppression"'),
      jsonHasConsent: result.json.content.includes(`"legalBundleId": "${seeded.legalBundleId}"`),
      jsonHasEbookAccess: result.json.content.includes(`"ebookId": "${seeded.ebookId}"`),
      jsonHasEligibility: result.json.content.includes('"eligible": false') && result.json.content.includes('"restricted": true'),
      suppressionIsPortable: [result.csv.content, result.json.content].every((content) => content.includes("minimum-objection-hash")),
    }).toStrictEqual({
      csvHasEligibility: true,
      csvHasPersonAndSuppression: true,
      jsonHasConsent: true,
      jsonHasEbookAccess: true,
      jsonHasEligibility: true,
      suppressionIsPortable: true,
    });
    const sensitiveValues = [
      "secret-provider-error",
      "secret-idempotency-key",
      "secret-message-id",
      "secret-workflow-id",
      "secret-webhook-id",
    ];
    expect(
      [result.csv.content, result.json.content].some((content) => sensitiveValues.some((value) => content.includes(value)))
    ).toBeFalsy();
  });
});
