import { Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { sTravelPackCreate, sTravelPackDescription, sTravelPackSlug, sTravelPackYoutubeUrl } from "./travel-packs";

describe("Travel Pack values", () => {
  it.each(["bali-en-couleurs", "pack-2026", "bali"])("accepts the canonical slug %s", (slug) => {
    expect(S.decodeSync(sTravelPackSlug)(slug)).toBe(slug);
  });

  it("allows an incomplete draft creation while requiring its title", () => {
    expect(S.is(sTravelPackCreate)({ title: "Bali" })).toBeTruthy();
    expect(S.is(sTravelPackCreate)({ title: "" })).toBeFalsy();
    expect(S.decodeSync(sTravelPackCreate)({ title: "  Bali  " })).toStrictEqual({ title: "Bali" });
  });

  it("preserves raw Markdown descriptions", () => {
    const description = "\n# Bali\n\n**Texte** avec <span>HTML brut</span>.\n";

    expect(S.decodeSync(sTravelPackDescription)(description)).toBe(description);
  });

  it("accepts nullable valid video URLs and rejects invalid URLs", () => {
    expect(S.decodeSync(sTravelPackYoutubeUrl)(null)).toBeNull();
    expect(S.decodeSync(sTravelPackYoutubeUrl)("https://www.youtube.com/watch?v=example")).toBe("https://www.youtube.com/watch?v=example");
    expect(S.is(sTravelPackYoutubeUrl)("not-a-url")).toBeFalsy();
  });
});
