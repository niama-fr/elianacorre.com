import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import * as newsletterFunctions from "@/lib/newsletter/functions";
import { getNewsletterHashNavigation } from "@/routes/_public/-newsletter";
import { routeTree } from "@/routeTree.gen";

vi.spyOn(newsletterFunctions, "confirmNewsletter").mockResolvedValue({ confirmed: true, downloadToken: "download-token" });

const createSignedLinkRouter = (signedPath: string) => {
  const convexQueryClient = new ConvexQueryClient("https://newsletter-test.convex.cloud");
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: async () => {
          await Promise.resolve();
          return null;
        },
      },
    },
  });
  convexQueryClient.connect(queryClient);

  return createRouter({
    context: { convexQueryClient, queryClient },
    history: createMemoryHistory({ initialEntries: [signedPath] }),
    routeTree,
  });
};

const expectViewToSurviveHashChanges = async (signedPath: string, expectedContent: readonly string[]) => {
  const router = createSignedLinkRouter(signedPath);
  await router.load();

  await router.navigate(getNewsletterHashNavigation(true));
  const enteredNewsletterHtml = renderToStaticMarkup(<RouterProvider router={router} />);
  for (const content of expectedContent) expect(enteredNewsletterHtml).toContain(content);
  expect(router.state.location.hash).toBe("la-gazette-itinerante");

  await router.navigate(getNewsletterHashNavigation(false));
  const leftNewsletterHtml = renderToStaticMarkup(<RouterProvider router={router} />);
  for (const content of expectedContent) expect(leftNewsletterHtml).toContain(content);
  expect(router.state.location.hash).toBe("");
};

describe("newsletter section hash synchronization", () => {
  it("preserves the confirmation success and immediate e-book download", async () => {
    expect.hasAssertions();
    await expectViewToSurviveHashChanges("/newsletter/confirmation?token=confirmation-token", ["Votre inscription", "download-token"]);
  });

  it("preserves the download-started state and manual fallback", async () => {
    expect.hasAssertions();
    await expectViewToSurviveHashChanges("/newsletter/ebook?token=ebook-token", ["Votre téléchargement", "ebook-token"]);
  });
});
