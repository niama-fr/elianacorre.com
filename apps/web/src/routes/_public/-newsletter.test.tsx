import { ConvexQueryClient } from "@convex-dev/react-query";
import { zNewsletterLegalBundle } from "@ec/domain/schemas/newsletter-legal-bundles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import * as newsletterFunctions from "@/lib/newsletter/functions";
import { getNewsletterHashNavigation } from "@/routes/_public/-newsletter";
import { NewsletterForm } from "@/routes/_public/-newsletter.form";
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

describe("newsletter consent presentation", () => {
  it("embeds the displayed legal bundle identity in the subscription form", () => {
    const bundle = zNewsletterLegalBundle.parse({
      _creationTime: 1,
      _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw3",
      newsletterConsent: {
        _creationTime: 1,
        _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw4",
        content: "J’accepte de recevoir la lettre.",
        kind: "newsletterConsent",
        publishedAt: 1,
        publishedBy: null,
      },
      newsletterConsentId: "k170e5dj9c8heby7eah6c4mr6h7a7tw4",
      privacyNotice: {
        _creationTime: 1,
        _id: "k170e5dj9c8heby7eah6c4mr6h7a7tw5",
        content: "Notice de confidentialité.",
        kind: "privacyNotice",
        publishedAt: 1,
        publishedBy: null,
      },
      privacyNoticeId: "k170e5dj9c8heby7eah6c4mr6h7a7tw5",
      publishedAt: 1,
      publishedBy: null,
    });

    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <NewsletterForm bundle={bundle} />
      </QueryClientProvider>
    );

    expect(html).toContain(`id="legalBundleId"`);
    expect(html).toContain(`value="${bundle._id}"`);
  });
});
