import { readWorksLayout } from "@ec/domain/layouts";
import { readAboutPage, readIndexPage } from "@ec/domain/pages";
import { describe, expect, it } from "vitest";
import routeTreeSource from "./routeTree.gen.ts?raw";

describe("public routes", () => {
  it("registers the stable application's critical routes", () => {
    for (const routePath of ["/", "/carnets-de-voyage", "/mentions-legales", "/oeuvres", "/qui-suis-je"]) {
      expect(routeTreeSource).toContain(`'${routePath}'`);
    }
  });

  it("loads critical public content", () => {
    expect(readIndexPage().contact.title).toContain("me contacter ?");
    expect(readAboutPage()).toHaveLength(3);
    expect(readWorksLayout().sets.length).toBeGreaterThan(0);
  });
});
