import { PRIVACY_NOTICE } from "@ec/domain/helpers/legal-texts";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("deployment seed", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("publishes a changed privacy notice without creating a legal bundle and remains idempotent", async () => {
    vi.stubEnv("WHITELIST_SEED", '["admin@example.com"]');
    const convex = convexTest(schema, modules);
    await convex.run(async (ctx) => {
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      await ctx.db.insert("legalTexts", {
        content: "outdated privacy notice",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: adminId,
      });
    });

    const beforePublication = Date.now();
    await convex.mutation(internal.seed.init, {});
    const afterPublication = Date.now();
    await convex.mutation(internal.seed.init, {});

    const state = await convex.run(async (ctx) => {
      const notices = await ctx.db
        .query("legalTexts")
        .withIndex("by_kind_and_published_at", (q) => q.eq("kind", "privacyNotice"))
        .collect();
      const scheduledFunctions = await ctx.db.system.query("_scheduled_functions").collect();
      return {
        currentNotices: notices.filter(({ content }) => content === PRIVACY_NOTICE),
        noticeCount: notices.length,
        scheduledFunctions,
      };
    });
    expect(state.currentNotices).toHaveLength(1);
    expect(state.currentNotices[0]?.publishedAt).toBeGreaterThanOrEqual(beforePublication);
    expect(state.currentNotices[0]?.publishedAt).toBeLessThanOrEqual(afterPublication);
    expect(state).toMatchObject({
      noticeCount: 2,
      scheduledFunctions: [{ name: "cache:revalidatePrivacyNotice", state: { kind: "pending" } }],
    });
  });
});
