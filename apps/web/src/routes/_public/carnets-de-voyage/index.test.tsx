import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Route, TravelDiariesPage } from "@/routes/_public/carnets-de-voyage/index";

describe("Carnets de voyage route", () => {
  it("publishes page-specific search and sharing metadata", async () => {
    const head = await Route.options.head?.({} as never);

    expect(head?.links).toContainEqual({ href: "https://elianacorre.com/carnets-de-voyage", rel: "canonical" });
    expect(head?.meta).toContainEqual({ title: "Carnets de voyage — Eliana Corré" });
    expect(head?.meta).toContainEqual({ content: "summary_large_image", name: "twitter:card" });
    expect(head?.meta).toContainEqual({
      content: "https://ik.imagekit.io/elianacorre/carnets-de-voyage/hero.jpg",
      property: "og:image",
    });
  });

  it("renders the approved journey and links every call to action to the newsletter", async () => {
    const rootRoute = createRootRoute({ component: Outlet });
    const travelDiariesRoute = createRoute({
      component: TravelDiariesPage,
      getParentRoute: () => rootRoute,
      path: "/carnets-de-voyage",
    });
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/carnets-de-voyage"] }),
      routeTree: rootRoute.addChildren([travelDiariesRoute]),
    });

    await router.load();
    const html = renderToStaticMarkup(<RouterProvider router={router} />);

    expect(html).toContain("Le carnet");
    expect(html).toContain("Commence");
    expect(html).toContain("mon e-book");
    expect(html.match(/href="\/carnets-de-voyage#la-gazette-itinerante"/gu)).toHaveLength(3);
  });
});
