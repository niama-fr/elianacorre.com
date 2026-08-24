// @vitest-environment jsdom

import { TRAVEL_PACK_ISSUE } from "@ec/domain/schemas/travel-packs";
import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { sTravelPackCreate, sTravelPackUpdate } from "./travel-packs.schemas";

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
    expect(S.is(sTravelPackCreate)({ title: "Bali" })).toBeTruthy();
    expect(S.is(sTravelPackCreate)({ title: "" })).toBeFalsy();
  });

  it("normalizes an empty YouTube form value to null", () => {
    const parsed = S.decodeSync(sTravelPackUpdate)(draft);

    expect(parsed.youtubeUrl).toBeNull();
  });

  it("trims a YouTube URL before storing it", () => {
    const parsed = S.decodeSync(sTravelPackUpdate)({
      ...draft,
      youtubeUrl: "  https://youtu.be/dQw4w9WgXcQ  ",
    });

    expect(parsed.youtubeUrl).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("rejects an invalid YouTube URL", () => {
    expect(() =>
      S.decodeSync(sTravelPackUpdate)({
        ...draft,
        youtubeUrl: "https://example.com/video",
      })
    ).toThrow(TRAVEL_PACK_ISSUE.youtubeUrlInvalid);
  });

  it("preserves raw Markdown", () => {
    const description = "\n# Bali\n\n**Texte** avec <span>HTML brut</span>.\n";

    const parsed = S.decodeSync(sTravelPackUpdate)({
      ...draft,
      description,
    });

    expect(parsed.description).toBe(description);
  });

  it("accepts supported cover and PDF files", () => {
    expect(() =>
      S.decodeSync(sTravelPackUpdate)({
        ...draft,
        cover: new File(["cover"], "cover.webp", { type: "image/webp" }),
        pdf: new File(["%PDF"], "pack.pdf", { type: "application/pdf" }),
      })
    ).not.toThrow();
  });

  it("rejects unsupported file MIME types", () => {
    expect(() =>
      S.decodeSync(sTravelPackUpdate)({
        ...draft,
        cover: new File(["cover"], "cover.txt", { type: "text/plain" }),
      })
    ).toThrow(TRAVEL_PACK_ISSUE.coverMimeTypeInvalid);
  });
});
