import { readRootLayout } from "@ec/domain/helpers/layouts";
import { GridBackground } from "@ec/ui/components/grid-background";
import { TooltipProvider } from "@ec/ui/components/tooltip";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Hydrate } from "@tanstack/react-start";
import { visible } from "@tanstack/react-start/hydration";

import { getServerFormState } from "@/lib/form/form.functions";
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
    const [bundle, formState] = await Promise.all([requireActiveNewsletterLegalBundle(), getServerFormState()]);
    return { bundle, formState, layout };
  },
});

// LAYOUT ----------------------------------------------------------------------------------------------------------------------------------
function PublicLayout() {
  const { bundle, formState, layout } = Route.useLoaderData();

  return (
    <TooltipProvider>
      <GridBackground />
      <Header {...layout} />
      <main className="relative mt-20 flex-1 sm:mt-28 md:mt-40">
        <Outlet />
      </main>
      <Hydrate when={visible({ rootMargin: "800px" })} prefetch={visible({ rootMargin: "1600px" })}>
        <Newsletter bundle={bundle} formState={formState} />
      </Hydrate>
      <Footer />
    </TooltipProvider>
  );
}
