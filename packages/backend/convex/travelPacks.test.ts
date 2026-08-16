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

const storeFile = async (convex: TestConvex<typeof schema>, contents: string, contentType: string) =>
  await convex.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob([contents], { type: contentType }));
    // @ts-expect-error -- convex-test omits Blob MIME metadata from its _storage fixture.
    await ctx.db.patch(storageId, { contentType });
    return storageId;
  });

const createIdentity = async (convex: TestConvex<typeof schema>, role: "admin" | "member") => {
  const now = Date.now();
  const user = zAuthUser.parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: {
          createdAt: now,
          email: `${role}@example.com`,
          emailVerified: true,
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
          token: `${role}-token`,
          updatedAt: now,
          userId: user._id,
        },
        model: "session",
      },
    })
  );

  await convex.run(async (ctx) => {
    const profileId = await ctx.db.insert("profiles", { email: user.email, role });
    await ctx.db.insert("identities", {
      adapter: "better-auth",
      adapterId: user._id,
      profileId,
    });
  });

  return convex.withIdentity({
    sessionId: session._id,
    subject: user._id,
  });
};

const createInput = (title: string) => ({ title });

const updateInput = (title: string, slug: string) => ({
  cover: null,
  description: "",
  destination: "",
  excerpt: "",
  pdf: null,
  slug,
  title,
  youtubeUrl: null,
});

const createDraft = async (convex: TestConvex<typeof schema>, title = "Nouveau pack") => {
  const asAdmin = await createIdentity(convex, "admin");
  const result = await asAdmin.mutation(api.travelPacks.create, createInput(title));

  if (!result.data) throw new Error("Draft creation failed");

  return { asAdmin, id: result.data };
};

describe("Travel Pack administration", () => {
  it("creates an incomplete draft with an automatic slug and progressively edits the canonical editorial fields", async () => {
    const convex = createBackend();
    const { asAdmin, id } = await createDraft(convex, "Bali en couleurs");

    const created = await asAdmin.query(api.travelPacks.get, {
      travelPackId: id,
    });

    expect(created).toMatchObject({
      createdBy: created.updatedBy,
      description: "",
      excerpt: "",
      slug: "bali-en-couleurs",
      status: "draft",
      title: "Bali en couleurs",
    });
    expect(created).not.toHaveProperty("shortDescription");
    expect(created).not.toHaveProperty("fullDescription");

    const coverStorageId = await storeFile(convex, "cover", "image/webp");
    const pdfStorageId = await storeFile(convex, "%PDF-1.7", "application/pdf");
    const rawMarkdown = "# Bali\n\n**Adresses** et <span>notes brutes</span>.";

    await asAdmin.mutation(api.travelPacks.update, {
      patch: {
        cover: { coverFileName: "bali.webp", coverStorageId },
        description: rawMarkdown,
        destination: "Indonésie",
        excerpt: "Un voyage dessiné à Bali.",
        pdf: { pdfFileName: "bali.pdf", pdfStorageId },
        slug: " Bali : le carnet ",
        title: "Bali, le carnet",
        youtubeUrl: "https://www.youtube.com/watch?v=example",
      },
      travelPackId: id,
    });

    const edited = await asAdmin.query(api.travelPacks.get, {
      travelPackId: id,
    });

    expect(edited).toMatchObject({
      description: rawMarkdown,
      excerpt: "Un voyage dessiné à Bali.",
      slug: "bali-le-carnet",
    });

    await asAdmin.mutation(api.travelPacks.update, {
      patch: {
        cover: null,
        description: edited.description,
        destination: edited.destination,
        excerpt: edited.excerpt,
        pdf: null,
        slug: edited.slug,
        title: "Bali : mes bonnes adresses",
        youtubeUrl: edited.youtubeUrl,
      },
      travelPackId: id,
    });

    await expect(asAdmin.query(api.travelPacks.get, { travelPackId: id })).resolves.toMatchObject({
      slug: "bali-le-carnet",
      title: "Bali : mes bonnes adresses",
    });
  });

  it("allocates deterministic suffixes and suggests a unique explicit regeneration from the current title", async () => {
    const convex = createBackend();
    const { asAdmin, id: firstId } = await createDraft(convex, "Tokyo");

    const second = await asAdmin.mutation(api.travelPacks.create, createInput("Tokyo"));
    const third = await asAdmin.mutation(api.travelPacks.create, createInput("Tokyo"));

    if (!second.data || !third.data) throw new Error("Draft creation failed");

    await expect(asAdmin.query(api.travelPacks.get, { travelPackId: firstId })).resolves.toMatchObject({
      slug: "tokyo",
    });

    await expect(asAdmin.query(api.travelPacks.get, { travelPackId: second.data })).resolves.toMatchObject({
      slug: "tokyo-2",
    });

    await expect(asAdmin.query(api.travelPacks.get, { travelPackId: third.data })).resolves.toMatchObject({
      slug: "tokyo-3",
    });

    await expect(
      asAdmin.query(api.travelPacks.suggestSlug, {
        title: "Tokyo autrement",
        travelPackId: second.data,
      })
    ).resolves.toBe("tokyo-autrement");
  });

  it("rejects duplicate manual slug edits and invalid normalized slugs", async () => {
    const convex = createBackend();
    const { asAdmin, id } = await createDraft(convex, "Bali");

    const other = await asAdmin.mutation(api.travelPacks.create, createInput("Tokyo"));

    if (!other.data) throw new Error("Draft creation failed");

    await expect(
      asAdmin.mutation(api.travelPacks.update, {
        patch: {
          ...updateInput("Bali", "bali"),
          slug: " Tokyo ",
        },
        travelPackId: id,
      })
    ).resolves.toStrictEqual({
      error: "TRAVEL_PACK_SLUG_TAKEN",
    });

    await expect(
      asAdmin.mutation(api.travelPacks.update, {
        patch: {
          ...updateInput("Bali", "bali"),
          slug: "---",
        },
        travelPackId: id,
      })
    ).rejects.toThrow(/TRAVEL_PACK_SLUG_REQUIRED/u);
  });

  it("rejects invalid cover and PDF storage documents without editing the draft", async () => {
    const convex = createBackend();
    const { asAdmin, id } = await createDraft(convex, "Tokyo");

    const invalidCoverStorageId = await storeFile(convex, "not an image", "text/plain");
    const pdfStorageId = await storeFile(convex, "%PDF-1.7", "application/pdf");

    await expect(
      asAdmin.mutation(api.travelPacks.update, {
        patch: {
          ...updateInput("Tokyo", "tokyo"),
          cover: {
            coverFileName: "cover.txt",
            coverStorageId: invalidCoverStorageId,
          },
          pdf: {
            pdfFileName: "pack.pdf",
            pdfStorageId,
          },
        },
        travelPackId: id,
      })
    ).resolves.toStrictEqual({
      error: "INVALID_TRAVEL_PACK_COVER",
    });

    await expect(asAdmin.query(api.travelPacks.get, { travelPackId: id })).resolves.toMatchObject({
      coverStorageId: null,
      pdfStorageId: null,
    });

    const coverStorageId = await storeFile(convex, "cover", "image/jpeg");
    const invalidPdfStorageId = await storeFile(convex, "not a PDF", "text/plain");

    await expect(
      asAdmin.mutation(api.travelPacks.update, {
        patch: {
          ...updateInput("Tokyo", "tokyo"),
          cover: {
            coverFileName: "cover.jpg",
            coverStorageId,
          },
          pdf: {
            pdfFileName: "pack.txt",
            pdfStorageId: invalidPdfStorageId,
          },
        },
        travelPackId: id,
      })
    ).resolves.toStrictEqual({
      error: "INVALID_TRAVEL_PACK_PDF",
    });

    await expect(asAdmin.query(api.travelPacks.get, { travelPackId: id })).resolves.toMatchObject({
      coverStorageId: null,
      pdfStorageId: null,
    });
  });

  it("removes replaced cover and PDF storage documents after a successful edit", async () => {
    const convex = createBackend();
    const { asAdmin, id } = await createDraft(convex, "Tokyo");

    const firstCoverStorageId = await storeFile(convex, "first cover", "image/jpeg");
    const firstPdfStorageId = await storeFile(convex, "%PDF-1.7 first", "application/pdf");

    await asAdmin.mutation(api.travelPacks.update, {
      patch: {
        ...updateInput("Tokyo", "tokyo"),
        cover: {
          coverFileName: "first.jpg",
          coverStorageId: firstCoverStorageId,
        },
        pdf: {
          pdfFileName: "first.pdf",
          pdfStorageId: firstPdfStorageId,
        },
      },
      travelPackId: id,
    });

    const secondCoverStorageId = await storeFile(convex, "second cover", "image/webp");
    const secondPdfStorageId = await storeFile(convex, "%PDF-1.7 second", "application/pdf");

    await asAdmin.mutation(api.travelPacks.update, {
      patch: {
        ...updateInput("Tokyo", "tokyo"),
        cover: {
          coverFileName: "second.webp",
          coverStorageId: secondCoverStorageId,
        },
        pdf: {
          pdfFileName: "second.pdf",
          pdfStorageId: secondPdfStorageId,
        },
      },
      travelPackId: id,
    });

    await expect(convex.run(async (ctx) => await ctx.db.system.get("_storage", firstCoverStorageId))).resolves.toBeNull();

    await expect(convex.run(async (ctx) => await ctx.db.system.get("_storage", firstPdfStorageId))).resolves.toBeNull();

    await expect(convex.run(async (ctx) => await ctx.db.system.get("_storage", secondCoverStorageId))).resolves.not.toBeNull();

    await expect(convex.run(async (ctx) => await ctx.db.system.get("_storage", secondPdfStorageId))).resolves.not.toBeNull();
  });

  it("keeps the draft-edit boundary closed for published packs until NIA-55 owns publication", async () => {
    const convex = createBackend();
    const { asAdmin, id } = await createDraft(convex, "Tokyo");

    await convex.run(async (ctx) => {
      await ctx.db.patch(id, { status: "published" });
    });

    await expect(
      asAdmin.mutation(api.travelPacks.update, {
        patch: updateInput("Tokyo autrement", "tokyo-autrement"),
        travelPackId: id,
      })
    ).rejects.toThrow("TRAVEL_PACK_NOT_EDITABLE");
  });

  it("rejects unauthenticated and non-administrator access", async () => {
    const convex = createBackend();
    const asMember = await createIdentity(convex, "member");

    await expect(convex.query(api.travelPacks.list, {})).rejects.toThrow("Unauthenticated");

    await expect(asMember.query(api.travelPacks.list, {})).rejects.toThrow("Unauthorized");

    await expect(
      asMember.query(api.travelPacks.suggestSlug, {
        title: "Tokyo",
        travelPackId: null,
      })
    ).rejects.toThrow("Unauthorized");

    await expect(asMember.mutation(api.travelPacks.generateUploadUrl, {})).rejects.toThrow("Unauthorized");
  });
});
