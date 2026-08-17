import type { Id } from "@ec/backend/types";
import { TRAVEL_PACK_ERROR, type TravelPacks } from "@ec/domain/schemas/travel-packs";
import type { TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import type schema from "./schema";
import { createBackend, createIdentity } from "./test.auth";

type AdminBackend = Awaited<ReturnType<typeof createIdentity>>;

const createDraft = async (asAdmin: AdminBackend, title: string) => {
  const result = await asAdmin.mutation(api.travelPacks.create, { title });

  if (result.data === undefined) throw new Error(`Travel Pack creation failed: ${result.error}`);

  return result.data;
};

const getPack = async (asAdmin: AdminBackend, travelPackId: Id<"travelPacks">) =>
  await asAdmin.query(api.travelPacks.get, { travelPackId });

const updateFrom = (pack: TravelPacks["Dto"], patch: Partial<TravelPacks["Update"]> = {}): TravelPacks["Update"] => ({
  _id: pack._id,
  coverFileName: pack.coverFileName,
  coverStorageId: pack.coverStorageId,
  description: pack.description,
  destination: pack.destination,
  excerpt: pack.excerpt,
  pdfFileName: pack.pdfFileName,
  pdfStorageId: pack.pdfStorageId,
  slug: pack.slug,
  title: pack.title,
  youtubeUrl: pack.youtubeUrl,
  ...patch,
});

const storeFile = async (convex: TestConvex<typeof schema>, contents: string, contentType: string) =>
  await convex.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob([contents], { type: contentType }));

    // @ts-expect-error -- convex-test omits Blob MIME metadata from its _storage fixture.
    await ctx.db.patch(storageId, { contentType });

    return storageId;
  });

describe("Travel Pack administration", () => {
  it("generates deterministic unique slugs for colliding draft titles", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    const firstId = await createDraft(asAdmin, "Bali");
    const secondId = await createDraft(asAdmin, "Bali");

    await expect(getPack(asAdmin, firstId)).resolves.toMatchObject({
      slug: "bali",
    });

    await expect(getPack(asAdmin, secondId)).resolves.toMatchObject({
      slug: "bali-2",
    });
  });

  it("suggests a unique regenerated slug without conflicting with another Travel Pack", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    await createDraft(asAdmin, "Bali");
    const tokyoId = await createDraft(asAdmin, "Tokyo");

    await expect(
      asAdmin.query(api.travelPacks.suggestSlug, {
        title: "Bali",
        travelPackId: tokyoId,
      })
    ).resolves.toBe("bali-2");
  });

  it("enforces slug uniqueness again when the draft is finally updated", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    await createDraft(asAdmin, "Bali");
    const tokyoId = await createDraft(asAdmin, "Tokyo");
    const tokyo = await getPack(asAdmin, tokyoId);

    const result = await asAdmin.mutation(
      api.travelPacks.update,
      updateFrom(tokyo, {
        slug: "bali",
      })
    );

    expect(result.error).toBeUndefined();

    await expect(getPack(asAdmin, tokyoId)).resolves.toMatchObject({
      slug: "bali-2",
    });
  });

  it("does not implicitly change the slug when the title changes", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    const travelPackId = await createDraft(asAdmin, "Bali");
    const pack = await getPack(asAdmin, travelPackId);

    await asAdmin.mutation(
      api.travelPacks.update,
      updateFrom(pack, {
        title: "Le guide complet de Bali",
      })
    );

    await expect(getPack(asAdmin, travelPackId)).resolves.toMatchObject({
      slug: "bali",
      title: "Le guide complet de Bali",
    });
  });

  it("rejects edits outside draft status", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    const travelPackId = await createDraft(asAdmin, "Bali");
    const pack = await getPack(asAdmin, travelPackId);

    await convex.run(async (ctx) => {
      await ctx.db.patch("travelPacks", travelPackId, {
        status: "published",
      });
    });

    await expect(
      asAdmin.mutation(
        api.travelPacks.update,
        updateFrom(pack, {
          title: "Should not change",
        })
      )
    ).resolves.toStrictEqual({
      error: TRAVEL_PACK_ERROR.notEditable,
    });
  });

  it("rejects a cover whose stored content is not an image", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    const travelPackId = await createDraft(asAdmin, "Bali");
    const pack = await getPack(asAdmin, travelPackId);
    const coverStorageId = await storeFile(convex, "not an image", "text/plain");

    await expect(
      asAdmin.mutation(
        api.travelPacks.update,
        updateFrom(pack, {
          coverFileName: "cover.txt",
          coverStorageId,
        })
      )
    ).resolves.toStrictEqual({
      error: TRAVEL_PACK_ERROR.coverInvalid,
    });
  });

  it("rejects a PDF whose stored content is not a PDF", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    const travelPackId = await createDraft(asAdmin, "Bali");
    const pack = await getPack(asAdmin, travelPackId);
    const pdfStorageId = await storeFile(convex, "not a pdf", "image/png");

    await expect(
      asAdmin.mutation(
        api.travelPacks.update,
        updateFrom(pack, {
          pdfFileName: "pack.png",
          pdfStorageId,
        })
      )
    ).resolves.toStrictEqual({
      error: TRAVEL_PACK_ERROR.pdfInvalid,
    });
  });

  it("adopts replacement cover and PDF storage", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    const travelPackId = await createDraft(asAdmin, "Bali");
    const initial = await getPack(asAdmin, travelPackId);

    const firstCoverId = await storeFile(convex, "cover one", "image/webp");
    const firstPdfId = await storeFile(convex, "%PDF-1.7 first", "application/pdf");

    await asAdmin.mutation(
      api.travelPacks.update,
      updateFrom(initial, {
        coverFileName: "cover-one.webp",
        coverStorageId: firstCoverId,
        pdfFileName: "first.pdf",
        pdfStorageId: firstPdfId,
      })
    );

    const withFirstFiles = await getPack(asAdmin, travelPackId);

    expect(withFirstFiles).toMatchObject({
      coverFileName: "cover-one.webp",
      coverStorageId: firstCoverId,
      pdfFileName: "first.pdf",
      pdfStorageId: firstPdfId,
    });

    const secondCoverId = await storeFile(convex, "cover two", "image/png");
    const secondPdfId = await storeFile(convex, "%PDF-1.7 second", "application/pdf");

    await asAdmin.mutation(
      api.travelPacks.update,
      updateFrom(withFirstFiles, {
        coverFileName: "cover-two.png",
        coverStorageId: secondCoverId,
        pdfFileName: "second.pdf",
        pdfStorageId: secondPdfId,
      })
    );

    await expect(getPack(asAdmin, travelPackId)).resolves.toMatchObject({
      coverFileName: "cover-two.png",
      coverStorageId: secondCoverId,
      pdfFileName: "second.pdf",
      pdfStorageId: secondPdfId,
    });
  });

  it("preserves existing cover and PDF references during a text-only update", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    const travelPackId = await createDraft(asAdmin, "Bali");
    const initial = await getPack(asAdmin, travelPackId);

    const coverStorageId = await storeFile(convex, "cover", "image/webp");
    const pdfStorageId = await storeFile(convex, "%PDF-1.7", "application/pdf");

    await asAdmin.mutation(
      api.travelPacks.update,
      updateFrom(initial, {
        coverFileName: "cover.webp",
        coverStorageId,
        pdfFileName: "pack.pdf",
        pdfStorageId,
      })
    );

    const withFiles = await getPack(asAdmin, travelPackId);

    await asAdmin.mutation(
      api.travelPacks.update,
      updateFrom(withFiles, {
        destination: "Indonésie",
        title: "Bali autrement",
      })
    );

    await expect(getPack(asAdmin, travelPackId)).resolves.toMatchObject({
      coverFileName: "cover.webp",
      coverStorageId,
      destination: "Indonésie",
      pdfFileName: "pack.pdf",
      pdfStorageId,
      title: "Bali autrement",
    });
  });

  it("persists raw Markdown unchanged", async () => {
    const convex = createBackend();
    const asAdmin = await createIdentity(convex, "admin");

    const travelPackId = await createDraft(asAdmin, "Bali");
    const pack = await getPack(asAdmin, travelPackId);

    const description = "\n# Bali\n\n**Texte** avec <span>HTML brut</span>.\n\n- un\n- deux\n";

    await asAdmin.mutation(
      api.travelPacks.update,
      updateFrom(pack, {
        description,
      })
    );

    const updated = await getPack(asAdmin, travelPackId);

    expect(updated.description).toBe(description);
  });
});
