// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { zTravelPackCreateValues, zTravelPackUpdateValues } from "./schemas";

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
    expect(zTravelPackCreateValues.safeParse({ title: "Bali" }).success).toBeTruthy();
    expect(zTravelPackCreateValues.safeParse({ title: "" }).success).toBeFalsy();
  });

  it("normalizes an empty YouTube form value to null", () => {
    const parsed = zTravelPackUpdateValues.parse(draft);

    expect(parsed.youtubeUrl).toBeNull();
  });

  it("trims a YouTube URL before storing it", () => {
    const parsed = zTravelPackUpdateValues.parse({
      ...draft,
      youtubeUrl: "  https://youtu.be/dQw4w9WgXcQ  ",
    });

    expect(parsed.youtubeUrl).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("rejects an invalid YouTube URL", () => {
    expect(
      zTravelPackUpdateValues.safeParse({
        ...draft,
        youtubeUrl: "https://example.com/video",
      }).success
    ).toBeFalsy();
  });

  it("preserves raw Markdown", () => {
    const description = "\n# Bali\n\n**Texte** avec <span>HTML brut</span>.\n";

    const parsed = zTravelPackUpdateValues.parse({
      ...draft,
      description,
    });

    expect(parsed.description).toBe(description);
  });
});
