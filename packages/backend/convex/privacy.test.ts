import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { hashCanonicalEmail } from "@ec/domain/helpers/suppressions";
import { convexTest, type TestConvex } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { api, components } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const createBackend = () => {
  vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");
  const convex = convexTest(schema, modules);
  registerBetterAuth(convex);
  return convex;
};

const zAuthUser = z.object({ _id: z.string(), email: z.email() });
const zAuthSession = z.object({ _id: z.string() });

const createIdentity = async (convex: TestConvex<typeof schema>, role: "admin" | "member") => {
  const now = Date.now();
  const user = zAuthUser.parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: now, email: `${role}@example.com`, emailVerified: true, name: role, updatedAt: now },
        model: "user",
      },
    })
  );
  const session = zAuthSession.parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: now, expiresAt: now + 60_000, token: `${role}-session`, updatedAt: now, userId: user._id },
        model: "session",
      },
    })
  );
  await convex.run(async (ctx) => {
    const profileId = await ctx.db.insert("profiles", { email: user.email, role });
    await ctx.db.insert("identities", { adapter: "better-auth", adapterId: user._id, profileId });
  });
  return convex.withIdentity({ sessionId: session._id, subject: user._id });
};

describe("privacy administration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not expose a person's data to an unauthenticated requester", async () => {
    const convex = createBackend();

    await expect(convex.query(api.privacy.inspectPerson, { email: "reader@example.com" })).rejects.toThrow("Unauthenticated");
  });

  it("finds one person by canonical email", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    await convex.run(async (ctx) => {
      await ctx.db.insert("profiles", { email: "reader@example.com", firstName: "Eliana", role: "contact" });
    });

    await expect(asAdmin.query(api.privacy.inspectPerson, { email: "  Reader@Example.COM " })).resolves.toMatchObject({
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

    await expect(asAdmin.query(api.privacy.inspectPerson, { email: "reader@example.com" })).resolves.toMatchObject({
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

    await expect(asAdmin.query(api.privacy.inspectPerson, { email: "missing@example.com" })).resolves.toBeNull();
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

    await expect(asAdmin.query(api.privacy.inspectPerson, { email: "erased@example.com" })).resolves.toStrictEqual({
      deliveryEligibility: { eligible: false, restriction: null, status: "suppressed" },
      newsletterConsent: { periods: [] },
      privacyState: { suppressed: true },
      profile: null,
      welcomeEbookAccess: { issuances: [] },
    });
  });

  it("rejects an authenticated non-administrator", async () => {
    const convex = createBackend();
    const asMember = await createIdentity(convex, "member");

    await expect(asMember.query(api.privacy.inspectPerson, { email: "reader@example.com" })).rejects.toThrow("Unauthorized");
  });
});
