// @vitest-environment jsdom

import { TRAVEL_PACK_ISSUE } from "@ec/domain/schemas/travel-packs";
import { VALIDATION_ISSUE } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { sTravelPackCreateForm, sTravelPackUpdateForm } from "./travel-packs.schemas";

const draft = {
  cover: null,
  description: "",
  destination: "",
  excerpt: "",
  pdf: null,
  slug: "bali",
  title: "Bali",
  youtubeUrl: "",
};

describe("Travel Pack form schemas", () => {
  it("allows an incomplete draft while validating the required title", () => {
    expect(S.is(sTravelPackCreateForm)({ title: "Bali" })).toBeTruthy();
    expect(() => S.decodeSync(sTravelPackCreateForm)({ title: "" })).toThrow(VALIDATION_ISSUE.required);
  });

  it("normalizes an empty YouTube form value to null", () => {
    const parsed = S.decodeSync(sTravelPackUpdateForm)(draft);

    expect(parsed.youtubeUrl).toBeNull();
  });

  it("trims a YouTube URL before storing it", () => {
    const parsed = S.decodeSync(sTravelPackUpdateForm)({
      ...draft,
      youtubeUrl: "  https://youtu.be/dQw4w9WgXcQ  ",
    });

    expect(parsed.youtubeUrl).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("rejects an invalid YouTube URL", () => {
    expect(() =>
      S.decodeSync(sTravelPackUpdateForm)({
        ...draft,
        youtubeUrl: "https://example.com/video",
      })
    ).toThrow(TRAVEL_PACK_ISSUE.youtubeUrlInvalid);
  });

  it("uses the shared slug validation identifier", () => {
    expect(() => S.decodeSync(sTravelPackUpdateForm)({ ...draft, slug: "Bali!" })).toThrow(VALIDATION_ISSUE.slugInvalid);
  });

  it("preserves raw Markdown", () => {
    const description = "\n# Bali\n\n**Texte** avec <span>HTML brut</span>.\n";

    const parsed = S.decodeSync(sTravelPackUpdateForm)({
      ...draft,
      description,
    });

    expect(parsed.description).toBe(description);
  });

  it("accepts supported cover and PDF files", () => {
    expect(() =>
      S.decodeSync(sTravelPackUpdateForm)({
        ...draft,
        cover: new File(["cover"], "cover.webp", { type: "image/webp" }),
        pdf: new File(["%PDF"], "pack.pdf", { type: "application/pdf" }),
      })
    ).not.toThrow();
  });

  it("rejects unsupported file MIME types", () => {
    expect(() =>
      S.decodeSync(sTravelPackUpdateForm)({
        ...draft,
        cover: new File(["cover"], "cover.txt", { type: "text/plain" }),
      })
    ).toThrow(TRAVEL_PACK_ISSUE.coverMimeTypeInvalid);
  });
});
