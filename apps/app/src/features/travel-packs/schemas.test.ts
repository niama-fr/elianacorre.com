// @vitest-environment jsdom

import { describe, expect, it } from "vitest";

import { zTravelPackCreateValues, zTravelPackUpdateValues } from "./schemas";

const updateValues = {
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
  it("validates the create form title", () => {
    expect(zTravelPackCreateValues.parse({ title: "  Bali  " })).toStrictEqual({ title: "Bali" });
    expect(zTravelPackCreateValues.safeParse({ title: "" }).success).toBeFalsy();
  });

  it("validates browser update values and normalizes empty optional values", () => {
    expect(zTravelPackUpdateValues.parse(updateValues)).toMatchObject({
      slug: "bali",
      title: "Bali",
      youtubeUrl: null,
    });

    expect(zTravelPackUpdateValues.safeParse({ ...updateValues, youtubeUrl: "not-a-url" }).success).toBeFalsy();
  });

  it("preserves raw Markdown and normalizes manually edited slugs", () => {
    const description = "\n# Bali\n\n**Texte** avec <span>HTML brut</span>.\n";

    const parsed = zTravelPackUpdateValues.parse({
      ...updateValues,
      description,
      slug: " Tokyo : mes bonnes adresses ",
    });

    expect(parsed.description).toBe(description);
    expect(parsed.slug).toBe("tokyo-mes-bonnes-adresses");
  });
});
