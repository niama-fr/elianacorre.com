import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NotFoundPage } from "@/routes/-not-found";
import { SafeErrorPage } from "@/routes/-safe-error";
import { loadNotFound } from "@/routes/_public/$";

describe("safe public fallbacks", () => {
  it("throws an explicit not-found result and renders the branded page", async () => {
    expect(() => {
      loadNotFound();
    }).toThrow(expect.objectContaining({ isNotFound: true }));

    const rootRoute = createRootRoute();
    const fallbackRoute = createRoute({ component: NotFoundPage, getParentRoute: () => rootRoute, path: "/missing" });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/missing"] }),
      routeTree: rootRoute.addChildren([fallbackRoute]),
    });
    await router.load();
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain("Page");
    expect(html).toContain("introuvable");
  });

  it("renders a safe error without stack or internal details", async () => {
    const rootRoute = createRootRoute();
    const errorRoute = createRoute({ component: SafeErrorPage, getParentRoute: () => rootRoute, path: "/error" });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/error"] }),
      routeTree: rootRoute.addChildren([errorRoute]),
    });
    await router.load();
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain("Une erreur inattendue est survenue");
    expect(html).not.toContain("stack");
  });
});
