import { convexQuery } from "@convex-dev/react-query";
import { api } from "@ec/backend/api";
import { readRootLayout } from "@ec/domain/helpers/layouts";
import { GridBackground } from "@ec/ui/components/grid-background";
import { Toaster } from "@ec/ui/components/sonner";
import { TooltipProvider } from "@ec/ui/components/tooltip";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Footer } from "@/routes/_public/-footer";
import { Header } from "@/routes/_public/-header";
import { Newsletter } from "@/routes/_public/-newsletter";

import styleCss from "@/styles/public.css?url";

const NEWSLETTER_BUNDLE_STALE_TIME = 5 * 60 * 1000;

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  head: () => ({
    links: [{ href: styleCss, rel: "stylesheet" }],
  }),
  loader: async ({ context }) => {
    const layout = readRootLayout();
    const bundle = await context.queryClient
      .ensureQueryData({ ...convexQuery(api.newsletterLegalBundles.requireActive), retry: 2, staleTime: NEWSLETTER_BUNDLE_STALE_TIME })
      .catch(() => null);
    return { bundle, layout };
  },
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function PublicLayout() {
  const { bundle, layout } = Route.useLoaderData();

  return (
    <TooltipProvider>
      <GridBackground />
      <Header {...layout} />
      <main className="relative mt-20 flex-1 sm:mt-28 md:mt-40">
        <Outlet />
      </main>
      {bundle ? <Newsletter bundle={bundle} /> : null}
      <Footer />
      <Toaster />
    </TooltipProvider>
  );
}
