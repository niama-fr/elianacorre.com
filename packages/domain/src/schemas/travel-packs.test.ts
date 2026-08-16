import { describe, expect, it } from "vitest";

import { zTravelPackCreate, zTravelPackDescription, zTravelPackSlug, zTravelPackSlugInput, zTravelPackYoutubeUrl } from "./travel-packs";

describe("Travel Pack values", () => {
  it.each(["bali-en-couleurs", "pack-2026", "bali"])("accepts the canonical slug %s", (slug) => {
    expect(zTravelPackSlug.parse(slug)).toBe(slug);
  });

  it.each([
    ["Bali", "bali"],
    ["bali en couleurs", "bali-en-couleurs"],
    ["-bali", "bali"],
    ["bali_2026", "bali-2026"],
    [" Tokyo : mes bonnes adresses ", "tokyo-mes-bonnes-adresses"],
  ])("normalizes the manually entered slug %s", (slug, expected) => {
    expect(zTravelPackSlugInput.parse(slug)).toBe(expected);
  });

  it("rejects invalid canonical and normalized slugs", () => {
    expect(zTravelPackSlug.safeParse("---").success).toBeFalsy();
    expect(zTravelPackSlugInput.safeParse("---").success).toBeFalsy();
  });

  it("allows an incomplete draft creation while requiring its title", () => {
    expect(zTravelPackCreate.safeParse({ title: "Bali" }).success).toBeTruthy();
    expect(zTravelPackCreate.safeParse({ title: "" }).success).toBeFalsy();
    expect(zTravelPackCreate.parse({ title: "  Bali  " })).toStrictEqual({ title: "Bali" });
  });

  it("preserves raw Markdown descriptions", () => {
    const description = "\n# Bali\n\n**Texte** avec <span>HTML brut</span>.\n";

    expect(zTravelPackDescription.parse(description)).toBe(description);
  });

  it("accepts nullable valid video URLs and rejects invalid URLs", () => {
    expect(zTravelPackYoutubeUrl.parse(null)).toBeNull();
    expect(zTravelPackYoutubeUrl.parse("https://www.youtube.com/watch?v=example")).toBe("https://www.youtube.com/watch?v=example");
    expect(zTravelPackYoutubeUrl.safeParse("not-a-url").success).toBeFalsy();
  });
});
