import { readRootLayout } from "@ec/domain/helpers/layouts";
import { GridBackground } from "@ec/ui/components/grid-background";
import { Toaster } from "@ec/ui/components/sonner";
import { TooltipProvider } from "@ec/ui/components/tooltip";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireActiveNewsletterLegalBundle } from "@/lib/newsletter-legal-bundles/functions";
import { Footer } from "@/routes/_public/-footer";
import { Header } from "@/routes/_public/-header";
import { Newsletter } from "@/routes/_public/-newsletter";

import styleCss from "@/styles/public.css?url";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createFileRoute("/_public")({
  component: PublicLayout,
  head: () => ({
    links: [{ href: styleCss, rel: "stylesheet" }],
  }),
  loader: async () => {
    const layout = readRootLayout();
    const bundle = await requireActiveNewsletterLegalBundle();
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
      <Newsletter bundle={bundle} />
      <Footer />
      <Toaster />
    </TooltipProvider>
  );
}
