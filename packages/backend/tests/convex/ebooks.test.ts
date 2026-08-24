import { RegisteredConvexFunction } from "@confect/server";
import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { createCapabilityToken } from "@ec/domain/helpers/capabilities";
import { MAX_SIZE } from "@ec/domain/helpers/storage";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { convexTest, type TestConvex } from "convex-test";
import { Effect as E, Schema as S } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";

import databaseSchema from "../../confect/_generated/schema";
import { api, components, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { isEbookDownloadAuthorized, requestEbookRecovery } from "../../features/ebooks";
import { modules } from "./test.setup";

vi.mock(import("@convex-dev/workflow"), async (importOriginal) => {
  const actual = await importOriginal();
  const workflowId = "test-workflow-id" as Awaited<ReturnType<typeof actual.start>>;
  return { ...actual, start: vi.fn<typeof actual.start>().mockResolvedValue(workflowId) } satisfies typeof actual;
});

const createBackend = () => {
  const convex = convexTest(schema, modules);
  registerBetterAuth(convex);
  registerRateLimiter(convex);
  return convex;
};

const sAuthUser = S.Struct({ _id: S.String, email: sCanonicalEmail });
const sAuthSession = S.Struct({ _id: S.String });

const storeFile = async (convex: TestConvex<typeof schema>, contents: string | ArrayBuffer, contentType = "application/pdf") =>
  await convex.run(async (ctx) => {
    const storageId = await Promise.resolve(ctx.storage.store(new Blob([contents], { type: contentType })));
    // @ts-expect-error -- convex-test omits Blob MIME metadata from its _storage fixture.
    await ctx.db.patch(storageId, { contentType });
    return storageId;
  });

const createIdentity = async (convex: TestConvex<typeof schema>, role: "admin" | "member", emailVerified = true) => {
  const now = Date.now();
  const user = S.decodeUnknownSync(sAuthUser)(
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
  const session = S.decodeUnknownSync(sAuthSession)(
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

const createRecoveryFixture = async (convex: TestConvex<typeof schema>, emails = ["reader@example.com"]) => {
  await convex.run(async (ctx) => {
    const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
    const privacyNoticeId = await ctx.db.insert("legalTexts", {
      content: "Privacy",
      kind: "privacyNotice",
      publishedAt: 1,
      publishedBy: adminId,
    });
    for (const email of emails) {
      const profileId = await ctx.db.insert("profiles", { email, role: "contact" });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 2,
        confirmedFrom: "email",
        privacyNoticeId,
        profileId,
        requestedAt: 1,
        unsubscribedAt: null,
      });
    }
    const storageId = await ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
    await ctx.db.insert("ebooks", {
      fileName: "ebook.pdf",
      publishedAt: 2,
      publishedBy: adminId,
      status: "published",
      storageId,
      title: "E-book",
      updatedAt: 2,
      uploadedBy: adminId,
      version: 1,
    });
  });
};

describe("e-book administration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

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

    if (!("data" in firstResult) || !("data" in secondResult)) throw new Error("Draft creation failed");

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
    await expect(asMember.mutation(api.storage.generateUploadUrl, {})).rejects.toThrow("Unauthorized");
  });

  it("authorizes an administrator by Profile role without requiring a verified provider email", async () => {
    const convex = createBackend();
    const asUnverifiedAdmin = await createIdentity(convex, "admin", false);

    await expect(asUnverifiedAdmin.query(api.ebooks.list, {})).resolves.toStrictEqual([]);
  });

  it("returns persisted download facts from the query and expires access at the exact boundary", async () => {
    vi.stubEnv("CAPABILITY_SIGNING_SECRET", "test-capability-secret");
    const convex = createBackend();
    const download = await convex.run(async (ctx) => {
      const adminId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      const profileId = await ctx.db.insert("profiles", { email: "reader@example.com", role: "contact" });
      const privacyNoticeId = await ctx.db.insert("legalTexts", {
        content: "Privacy",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: adminId,
      });
      await ctx.db.insert("newsSubscriptions", {
        confirmedAt: 2,
        confirmedFrom: "email",
        privacyNoticeId,
        profileId,
        requestedAt: 1,
        unsubscribedAt: null,
      });
      const storageId = await ctx.storage.store(new Blob(["%PDF-1.7"], { type: "application/pdf" }));
      const ebookId = await ctx.db.insert("ebooks", {
        fileName: "ebook.pdf",
        publishedAt: 2,
        publishedBy: adminId,
        status: "published",
        storageId,
        title: "E-book",
        updatedAt: 2,
        uploadedBy: adminId,
        version: 1,
      });
      const ebookIssuanceId = await ctx.db.insert("ebookIssuances", { ebookId, kind: "initial", profileId });
      const downloadId = await ctx.db.insert("ebookDownloads", { ebookIssuanceId });
      const doc = await ctx.db.get("ebookDownloads", downloadId);
      if (!doc) throw new Error("Download was not created");
      return doc;
    });
    const token = await E.runPromise(createCapabilityToken({ capabilityId: download._id, secret: "test-capability-secret" }));

    const facts = await convex.query(internal.ebooks.resolveDownload, { token });
    if (!facts) throw new Error("Download facts were not resolved");
    const expiresAt = download._creationTime + 72 * 60 * 60 * 1000;
    expect(isEbookDownloadAuthorized(facts, expiresAt - 1)).toBeTruthy();
    expect(isEbookDownloadAuthorized(facts, expiresAt)).toBeFalsy();
  });

  it("deduplicates repeated recovery requests inside the rate-limit window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 7, 23, 12));
    vi.stubEnv("CAPABILITY_SIGNING_SECRET", "test-capability-secret");
    vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");
    const convex = createBackend();
    await createRecoveryFixture(convex);

    const request = { email: "reader@example.com", website: "" } as const;
    await convex.mutation(api.ebooks.requestRecovery, request);
    await convex.mutation(api.ebooks.requestRecovery, request);

    const state = await convex.run(async (ctx) => ({
      downloads: await ctx.db.query("ebookDownloads").collect(),
      issuances: await ctx.db.query("ebookIssuances").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state).toMatchObject({
      downloads: [{}],
      issuances: [{ kind: "replacement" }],
      tasks: [{ kind: "sendEbookEmail" }],
    });
  });

  it("canonicalizes recovery email and defaults an omitted honeypot", async () => {
    vi.stubEnv("CAPABILITY_SIGNING_SECRET", "test-capability-secret");
    vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");
    const convex = createBackend();
    await createRecoveryFixture(convex);

    await convex.mutation(api.ebooks.requestRecovery, { email: "  Reader@Example.COM " });

    const state = await convex.run(async (ctx) => ({
      issuances: await ctx.db.query("ebookIssuances").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state).toMatchObject({ issuances: [{ kind: "replacement" }], tasks: [{ kind: "sendEbookEmail" }] });
  });

  it("trims a whitespace-only recovery honeypot at the public boundary", async () => {
    vi.stubEnv("CAPABILITY_SIGNING_SECRET", "test-capability-secret");
    vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");
    const convex = createBackend();
    await createRecoveryFixture(convex);

    await convex.mutation(api.ebooks.requestRecovery, { email: "reader@example.com", website: "   " });

    const state = await convex.run(async (ctx) => ({
      issuances: await ctx.db.query("ebookIssuances").collect(),
      tasks: await ctx.db.query("loopsTasks").collect(),
    }));
    expect(state).toMatchObject({ issuances: [{ kind: "replacement" }], tasks: [{ kind: "sendEbookEmail" }] });
  });

  it("enforces email and fallback-IP recovery limits", async () => {
    vi.stubEnv("CAPABILITY_SIGNING_SECRET", "test-capability-secret");
    vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");

    const emailLimited = createBackend();
    await createRecoveryFixture(emailLimited);

    for (let attempt = 0; attempt < 3; attempt += 1)
      await emailLimited.run(async (ctx) => {
        await E.runPromise(
          requestEbookRecovery({
            email: "reader@example.com",
            now: Date.UTC(2030, 0, 1),
            requestIp: `203.0.113.${attempt}`,
            website: "",
          }).pipe(E.provide(RegisteredConvexFunction.mutationLayer(databaseSchema, ctx)))
        );
      });

    await expect(
      emailLimited.run(async (ctx) => {
        await E.runPromise(
          requestEbookRecovery({
            email: "reader@example.com",
            now: Date.UTC(2030, 0, 1),
            requestIp: "203.0.113.3",
            website: "",
          }).pipe(E.provide(RegisteredConvexFunction.mutationLayer(databaseSchema, ctx)))
        );
      })
    ).rejects.toMatchObject({
      _tag: "RateLimitExceeded",
      name: "ebookRecoveryByEmail",
    });

    const emailLimitedIssuances = await emailLimited.run(async (ctx) => await ctx.db.query("ebookIssuances").collect());

    const ipLimited = createBackend();
    await createRecoveryFixture(ipLimited);

    for (const email of ["one@example.com", "two@example.com", "three@example.com"])
      await ipLimited.mutation(api.ebooks.requestRecovery, { email, website: "" });

    await expect(
      ipLimited.mutation(api.ebooks.requestRecovery, {
        email: "reader@example.com",
        website: "",
      })
    ).resolves.toBeNull();

    const ipLimitedIssuances = await ipLimited.run(async (ctx) => await ctx.db.query("ebookIssuances").collect());

    expect({ emailLimitedIssuances, ipLimitedIssuances }).toMatchObject({
      emailLimitedIssuances: [{ kind: "replacement" }, { kind: "replacement" }, { kind: "replacement" }],
      ipLimitedIssuances: [],
    });
  });

  it("rejects caller-supplied recovery metadata at the public boundary", async () => {
    const convex = createBackend();

    await expect(
      convex.mutation(api.ebooks.requestRecovery, {
        email: "reader@example.com",
        // @ts-expect-error -- requestIp is intentionally absent from the public contract.
        requestIp: "203.0.113.10",
        website: "",
      })
    ).rejects.toThrow("requestIp");
  });
});
