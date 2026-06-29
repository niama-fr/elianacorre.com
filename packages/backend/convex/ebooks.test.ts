import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
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
    await ctx.db.insert("profiles", { email: user.email, role, userId: user._id });
  });
  return convex.withIdentity({ sessionId: session._id, subject: user._id });
};

describe("e-book administration", () => {
  it("rejects an unauthenticated reader", async () => {
    const convex = createBackend();

    await expect(convex.query(api.ebooks.readAll, {})).rejects.toThrow("Unauthenticated");
  });

  it("allows an authenticated administrator to create a draft", async () => {
    const convex = createBackend();
    const storageId = await convex.run(
      async (ctx) => await Promise.resolve(ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" })))
    );
    const asAdmin = await createIdentity(convex, "admin");

    await asAdmin.mutation(api.ebooks.create, {
      fileName: "ebook.pdf",
      storageId,
      title: "Current e-book",
    });

    await expect(asAdmin.query(api.ebooks.readAll, {})).resolves.toMatchObject([
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

  it("keeps exactly one published e-book through publication and rollback", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");
    const firstStorageId = await convex.run(
      async (ctx) => await Promise.resolve(ctx.storage.store(new Blob(["%PDF-1.7 first"], { type: "application/pdf" })))
    );
    const secondStorageId = await convex.run(
      async (ctx) => await Promise.resolve(ctx.storage.store(new Blob(["%PDF-1.7 second"], { type: "application/pdf" })))
    );
    const firstId = await asAdmin.mutation(api.ebooks.create, {
      fileName: "first.pdf",
      storageId: firstStorageId,
      title: "First version",
    });
    const secondId = await asAdmin.mutation(api.ebooks.create, {
      fileName: "second.pdf",
      storageId: secondStorageId,
      title: "Second version",
    });

    await asAdmin.mutation(api.ebooks.publish, { _id: firstId });
    await asAdmin.mutation(api.ebooks.publish, { _id: secondId });

    const ebooks = await asAdmin.query(api.ebooks.readAll, {});
    expect(ebooks.filter(({ status }) => status === "published")).toHaveLength(1);
    expect(ebooks).toMatchObject([
      { _id: secondId, status: "published", version: 2 },
      { _id: firstId, status: "archived", version: 1 },
    ]);

    await asAdmin.mutation(api.ebooks.publish, { _id: firstId });

    const rolledBackEbooks = await asAdmin.query(api.ebooks.readAll, {});
    expect(rolledBackEbooks.filter(({ status }) => status === "published")).toHaveLength(1);
    expect(rolledBackEbooks).toMatchObject([
      { _id: secondId, status: "archived", version: 2 },
      { _id: firstId, status: "published", version: 1 },
    ]);
  });

  it("rejects an authenticated non-administrator", async () => {
    const convex = createBackend();
    const asMember = await createIdentity(convex, "member");

    await expect(asMember.query(api.ebooks.readAll, {})).rejects.toThrow("Unauthorized");
    await expect(asMember.mutation(api.ebooks.generateUploadUrl, {})).rejects.toThrow("Unauthorized");
  });

  it("rejects an administrator with an unverified email", async () => {
    const convex = createBackend();
    const asUnverifiedAdmin = await createIdentity(convex, "admin", false);

    await expect(asUnverifiedAdmin.query(api.ebooks.readAll, {})).rejects.toThrow("Unauthenticated");
  });
});
