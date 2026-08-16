import { describe, expect, it } from "vitest";

import { slugify, suffixSlug } from "./slugs";

describe("slugs", () => {
  it.each([
    ["Tokyo autrement", "tokyo-autrement"],
    ["Tokyo : mes bonnes adresses", "tokyo-mes-bonnes-adresses"],
    ["São Tomé & Príncipe", "sao-tome-principe"],
  ])("normalizes %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("adds deterministic collision suffixes", () => {
    expect(suffixSlug("tokyo", 1)).toBe("tokyo");
    expect(suffixSlug("tokyo", 2)).toBe("tokyo-2");
    expect(suffixSlug("tokyo", 3)).toBe("tokyo-3");
  });
});
