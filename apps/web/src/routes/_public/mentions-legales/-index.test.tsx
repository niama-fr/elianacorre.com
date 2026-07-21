import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LegalNoticesPage, readLegalNoticesHead } from "./index";

describe("Mentions légales route", () => {
  it("publishes legal-notice metadata", () => {
    const head = readLegalNoticesHead();
    expect(head.links).toContainEqual({ href: "https://elianacorre.com/mentions-legales", rel: "canonical" });
    expect(head.meta).toContainEqual({ title: "Mentions légales — Eliana Corré" });
    expect(head.meta).toContainEqual({ content: "summary_large_image", name: "twitter:card" });
  });

  it("renders the current publisher information without duplicating the privacy notice", async () => {
    const rootRoute = createRootRoute();
    const legalNoticesRoute = createRoute({ component: LegalNoticesPage, getParentRoute: () => rootRoute, path: "/mentions-legales" });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/mentions-legales"] }),
      routeTree: rootRoute.addChildren([legalNoticesRoute]),
    });

    await router.load();
    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    expect(html).toContain("107 chemin de ligne, Les Canots");
    expect(html).toContain("97427 Étang-Salé");
    expect(html).toContain('href="mailto:contact@elianacorre.com"');
    expect(html).toContain('href="/confidentialite"');
    expect(html).not.toContain("1A rue Gérard de Nerval");
  });
});
