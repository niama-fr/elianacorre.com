import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { MAX_SIZE } from "@ec/domain/helpers/storage";
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { api, components } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const createBackend = () => {
  const convex = convexTest(schema, modules);
  registerBetterAuth(convex);
  return convex;
};

const zAuthUser = z.object({ _id: z.string(), email: z.email() });
const zAuthSession = z.object({ _id: z.string() });

const storeFile = async (convex: TestConvex<typeof schema>, contents: string | ArrayBuffer, contentType = "application/pdf") =>
  await convex.run(async (ctx) => {
    const storageId = await Promise.resolve(ctx.storage.store(new Blob([contents], { type: contentType })));
    // @ts-expect-error -- convex-test omits Blob MIME metadata from its _storage fixture.
    await ctx.db.patch(storageId, { contentType });
    return storageId;
  });

const createIdentity = async (convex: TestConvex<typeof schema>, role: "admin" | "member", emailVerified = true) => {
  const now = Date.now();
  const user = zAuthUser.parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: {
          createdAt: now,
          email: `${role}@example.com`,
          emailVerified,
          name: role,
          updatedAt: now,
        },
        model: "user",
      },
    })
  );
  const session = zAuthSession.parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: {
          createdAt: now,
          expiresAt: now + 60_000,
          token: "session-token",
          updatedAt: now,
          userId: user._id,
        },
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

describe("e-book administration", () => {
  it("rejects an unauthenticated reader", async () => {
    const convex = createBackend();

    await expect(convex.query(api.ebooks.list, {})).rejects.toThrow("Unauthenticated");
  });

  it("allows an authenticated administrator to create a draft", async () => {
    const convex = createBackend();
    const storageId = await storeFile(convex, "%PDF-1.7");
    const asAdmin = await createIdentity(convex, "admin");

    await asAdmin.mutation(api.ebooks.create, {
      fileName: "ebook.pdf",
      storageId,
      title: "Current e-book",
    });

    await expect(asAdmin.query(api.ebooks.list, {})).resolves.toMatchObject([
      {
        fileName: "ebook.pdf",
        publishedAt: null,
        publishedBy: null,
        status: "draft",
        title: "Current e-book",
        version: 1,
      },
    ]);
  });

  it("rejects a stored file that is not a PDF", async () => {
    const convex = createBackend();
    const storageId = await storeFile(convex, "not a PDF", "text/plain");
    const asAdmin = await createIdentity(convex, "admin");

    await expect(
      asAdmin.mutation(api.ebooks.create, {
        fileName: "ebook.txt",
        storageId,
        title: "Invalid e-book",
      })
    ).resolves.toStrictEqual({ error: "INVALID_STORAGE_DOC" });
    await expect(convex.run(async (ctx) => await ctx.db.system.get("_storage", storageId))).resolves.toBeNull();
  });

  it("rejects a PDF larger than 20 MB", async () => {
    const convex = createBackend();
    const storageId = await storeFile(convex, new ArrayBuffer(MAX_SIZE + 1));
    const asAdmin = await createIdentity(convex, "admin");

    await expect(
      asAdmin.mutation(api.ebooks.create, {
        fileName: "ebook.pdf",
        storageId,
        title: "Oversized e-book",
      })
    ).resolves.toStrictEqual({ error: "INVALID_STORAGE_DOC" });
    await expect(convex.run(async (ctx) => await ctx.db.system.get("_storage", storageId))).resolves.toBeNull();
  });

  it("keeps exactly one published e-book through publication and rollback", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const firstStorageId = await storeFile(convex, "%PDF-1.7 first");
    const secondStorageId = await storeFile(convex, "%PDF-1.7 second");
    const firstResult = await asAdmin.mutation(api.ebooks.create, {
      fileName: "first.pdf",
      storageId: firstStorageId,
      title: "First version",
    });
    const secondResult = await asAdmin.mutation(api.ebooks.create, {
      fileName: "second.pdf",
      storageId: secondStorageId,
      title: "Second version",
    });
    if (firstResult.data === undefined || secondResult.data === undefined) throw new Error("Draft creation failed");
    const firstId = firstResult.data;
    const secondId = secondResult.data;

    await asAdmin.mutation(api.ebooks.publish, { ebookId: firstId });
    await asAdmin.mutation(api.ebooks.publish, { ebookId: secondId });

    const ebooks = await asAdmin.query(api.ebooks.list, {});
    expect(ebooks.filter(({ status }) => status === "published")).toHaveLength(1);
    expect(ebooks).toMatchObject([
      { _id: secondId, status: "published", version: 2 },
      { _id: firstId, status: "archived", version: 1 },
    ]);

    await asAdmin.mutation(api.ebooks.publish, { ebookId: firstId });

    const rolledBackEbooks = await asAdmin.query(api.ebooks.list, {});
    expect(rolledBackEbooks.filter(({ status }) => status === "published")).toHaveLength(1);
    expect(rolledBackEbooks).toMatchObject([
      { _id: secondId, status: "archived", version: 2 },
      { _id: firstId, status: "published", version: 1 },
    ]);
  });

  it("rejects an authenticated non-administrator", async () => {
    const convex = createBackend();
    const asMember = await createIdentity(convex, "member");

    await expect(asMember.query(api.ebooks.list, {})).rejects.toThrow("Unauthorized");
    await expect(asMember.mutation(api.ebooks.generateUploadUrl, {})).rejects.toThrow("Unauthorized");
  });

  it("rejects an administrator with an unverified email", async () => {
    const convex = createBackend();
    const asUnverifiedAdmin = await createIdentity(convex, "admin", false);

    await expect(asUnverifiedAdmin.query(api.ebooks.list, {})).rejects.toThrow("Unauthenticated");
  });
});
