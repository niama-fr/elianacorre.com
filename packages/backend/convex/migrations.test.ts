import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { backfillSubscriptionPrivacyNoticeId } from "./migrations";
import schema from "./schema";
import { modules } from "./test.setup";

const createLegacySubscription = async (
  ctx: Parameters<typeof backfillSubscriptionPrivacyNoticeId>[0],
  options: { privacyKind?: "newsletterConsent" | "privacyNotice"; privacyPublishedAt?: number | null } = {}
) => {
  const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
  const profileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
  const privacyNoticeId = await ctx.db.insert("legalTexts", {
    content: "Privacy",
    kind: options.privacyKind ?? "privacyNotice",
    publishedAt: "privacyPublishedAt" in options ? (options.privacyPublishedAt ?? null) : 1,
    publishedBy: adminId,
  });
  const newsletterConsentId = await ctx.db.insert("legalTexts", {
    content: "Legacy consent",
    kind: "newsletterConsent",
    publishedAt: 1,
    publishedBy: adminId,
  });
  const legalBundleId = await ctx.db.insert("newsletterLegalBundles", {
    newsletterConsentId,
    privacyNoticeId,
    publishedAt: 1,
    publishedBy: adminId,
  });
  const subscriptionId = await ctx.db.insert("newsSubscriptions", {
    confirmedAt: 3,
    confirmedFrom: "email",
    legalBundleId,
    profileId,
    requestedAt: 2,
    unsubscribedAt: null,
  });
  const subscription = await ctx.db.get(subscriptionId);
  if (subscription === null) throw new Error("Legacy subscription was not found");
  return { legalBundleId, privacyNoticeId, subscription };
};

describe("newsletter privacy-notice migration", () => {
  it("backfills legacy evidence and is idempotent", async () => {
    const convex = convexTest(schema, modules);

    await convex.run(async (ctx) => {
      const { privacyNoticeId, subscription } = await createLegacySubscription(ctx);
      const patch = await backfillSubscriptionPrivacyNoticeId(ctx, subscription);
      expect(patch).toStrictEqual({ privacyNoticeId });
      await ctx.db.patch(subscription._id, patch ?? {});

      const migrated = await ctx.db.get(subscription._id);
      if (migrated === null) throw new Error("Migrated subscription was not found");
      await expect(backfillSubscriptionPrivacyNoticeId(ctx, migrated)).resolves.toBeUndefined();
    });
  });

  it("rejects a subscription with no resolvable consent evidence", async () => {
    const convex = convexTest(schema, modules);

    await expect(
      convex.run(async (ctx) => {
        const profileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
        const subscriptionId = await ctx.db.insert("newsSubscriptions", {
          confirmedAt: null,
          confirmedFrom: null,
          profileId,
          requestedAt: 2,
          unsubscribedAt: null,
        });
        const subscription = await ctx.db.get(subscriptionId);
        if (subscription === null) throw new Error("Subscription was not found");
        await backfillSubscriptionPrivacyNoticeId(ctx, subscription);
      })
    ).rejects.toThrow("MISSING_SUBSCRIPTION_LEGAL_BUNDLE");
  });

  it("rejects a subscription whose historical legal bundle is missing", async () => {
    const convex = convexTest(schema, modules);

    await expect(
      convex.run(async (ctx) => {
        const { legalBundleId, subscription } = await createLegacySubscription(ctx);
        await ctx.db.delete(legalBundleId);
        await backfillSubscriptionPrivacyNoticeId(ctx, subscription);
      })
    ).rejects.toThrow("MISSING_SUBSCRIPTION_LEGAL_BUNDLE");
  });

  it.each([
    { privacyKind: "newsletterConsent" as const, privacyPublishedAt: 1 },
    { privacyKind: "privacyNotice" as const, privacyPublishedAt: null },
    { privacyKind: "privacyNotice" as const, privacyPublishedAt: 3 },
  ])("rejects invalid historical privacy-notice evidence %#", async (options) => {
    const convex = convexTest(schema, modules);

    await expect(
      convex.run(async (ctx) => {
        const { subscription } = await createLegacySubscription(ctx, options);
        await backfillSubscriptionPrivacyNoticeId(ctx, subscription);
      })
    ).rejects.toThrow("INVALID_SUBSCRIPTION_PRIVACY_NOTICE");
  });
});
