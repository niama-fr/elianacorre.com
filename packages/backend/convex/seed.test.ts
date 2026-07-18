import { PRIVACY_NOTICE } from "@ec/domain/helpers/legal-texts";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("deployment seed", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("publishes changed legal text in a new immutable bundle and remains idempotent", async () => {
    vi.stubEnv("WHITELIST_SEED", '["admin@example.com"]');
    const convex = convexTest(schema, modules);
    await convex.run(async (ctx) => {
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const newsletterConsentId = await ctx.db.insert("legalTexts", {
        content: "current consent",
        kind: "newsletterConsent",
        publishedAt: 1,
        publishedBy: adminId,
      });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "outdated privacy notice",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: adminId,
      });
      await ctx.db.insert("newsletterLegalBundles", { newsletterConsentId, privacyNoticeId, publishedAt: 1, publishedBy: adminId });
    });

    await convex.mutation(internal.seed.init, {});
    await convex.mutation(internal.seed.init, {});

    const state = await convex.run(async (ctx) => {
      const bundles = await ctx.db.query("newsletterLegalBundles").collect();
      const notices = await ctx.db
        .query("legalTexts")
        .withIndex("by_kind_and_published_at", (q) => q.eq("kind", "privacyNotice"))
        .collect();
      const currentNotice = notices.find(({ content }) => content === PRIVACY_NOTICE.content);
      return {
        bundleCount: bundles.length,
        currentBundlePublished: currentNotice !== undefined && bundles.some(({ privacyNoticeId }) => privacyNoticeId === currentNotice._id),
        noticeCount: notices.length,
      };
    });
    expect(state).toStrictEqual({ bundleCount: 2, currentBundlePublished: true, noticeCount: 2 });
  });
});
