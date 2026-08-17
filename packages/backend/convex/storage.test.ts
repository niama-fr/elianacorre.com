import { ORPHAN_STORAGE_GRACE_MS } from "@ec/backend/business/storage";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const NOW = Date.UTC(2026, 7, 17, 12);

describe("storage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("purges old unreferenced files while preserving recent and referenced storage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW - ORPHAN_STORAGE_GRACE_MS - 1);

    const convex = convexTest(schema, modules);

    const files = await convex.run(async (ctx) => {
      const orphan = await ctx.storage.store(new Blob(["orphan"]));
      const ebook = await ctx.storage.store(new Blob(["ebook"]));
      const cover = await ctx.storage.store(new Blob(["cover"]));
      const pdf = await ctx.storage.store(new Blob(["pdf"]));

      const profileId = await ctx.db.insert("profiles", {
        email: "admin@example.com",
        role: "admin",
      });

      await ctx.db.insert("ebooks", {
        fileName: "ebook.pdf",
        publishedAt: null,
        publishedBy: null,
        status: "draft",
        storageId: ebook,
        title: "E-book",
        updatedAt: Date.now(),
        uploadedBy: profileId,
        version: 1,
      });

      await ctx.db.insert("travelPacks", {
        coverFileName: "cover.webp",
        coverStorageId: cover,
        createdBy: profileId,
        description: "",
        destination: "",
        excerpt: "",
        pdfFileName: "pack.pdf",
        pdfStorageId: pdf,
        slug: "tokyo",
        status: "draft",
        title: "Tokyo",
        updatedAt: Date.now(),
        updatedBy: profileId,
        youtubeUrl: null,
      });

      return { cover, ebook, orphan, pdf };
    });

    vi.setSystemTime(NOW);

    const recentOrphan = await convex.run(async (ctx) => await ctx.storage.store(new Blob(["recent orphan"])));

    await expect(
      convex.mutation(internal.storage.purgeOrphans, {
        before: null,
        cursor: null,
      })
    ).resolves.toMatchObject({
      deleted: 1,
      done: true,
    });

    await convex.run(async (ctx) => {
      await expect(ctx.db.system.get("_storage", files.orphan)).resolves.toBeNull();

      await expect(ctx.db.system.get("_storage", files.ebook)).resolves.not.toBeNull();
      await expect(ctx.db.system.get("_storage", files.cover)).resolves.not.toBeNull();
      await expect(ctx.db.system.get("_storage", files.pdf)).resolves.not.toBeNull();
      await expect(ctx.db.system.get("_storage", recentOrphan)).resolves.not.toBeNull();
    });
  });
});
