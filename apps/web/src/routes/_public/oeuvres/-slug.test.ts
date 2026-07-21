import { describe, expect, it } from "vitest";

import { readCollection } from "./$slug";

describe("artwork collection routes", () => {
  it("derives collection content for a known canonical slug", () => {
    const collection = readCollection("bestiaire");
    expect(collection.set).toMatchObject({ slug: "bestiaire", title: "Bestiaire" });
    expect(collection.works.length).toBeGreaterThan(0);
  });

  it("returns an explicit not-found result for an unknown slug", () => {
    expect(() => readCollection("collection-inconnue")).toThrow(expect.objectContaining({ isNotFound: true }));
  });
});
