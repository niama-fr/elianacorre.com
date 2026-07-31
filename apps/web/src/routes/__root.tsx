import { readRootLayout } from "@ec/domain/helpers/layouts";
import { GridBackground } from "@ec/ui/components/grid-background";
import { Toaster } from "@ec/ui/components/sonner";
import { TooltipProvider } from "@ec/ui/components/tooltip";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { Hydrate } from "@tanstack/react-start";
import { visible } from "@tanstack/react-start/hydration";
import { useEffect, useState } from "react";

import { getServerFormState } from "@/lib/form/form.functions";
import { requireActiveNewsletterLegalBundle } from "@/lib/newsletter-legal-bundles/functions";
import { Footer } from "@/routes/-footer";
import { Header } from "@/routes/-header";
import { Newsletter } from "@/routes/-newsletter";

import styleCss from "@/styles.css?url";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createRootRoute({
  head: () => ({
    links: [
      { href: styleCss, rel: "stylesheet" },
      { href: "/favicon.ico", rel: "icon" },
      { href: "/favicon-32x32.png", rel: "icon", sizes: "32x32", type: "image/png" },
      { href: "/favicon-16x16.png", rel: "icon", sizes: "16x16", type: "image/png" },
      { href: "/apple-touch-icon.png", rel: "apple-touch-icon", sizes: "180x180" },
      { href: "/manifest.json", rel: "manifest" },
    ],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { content: "Eliana Corré", name: "author" },
      { content: "#f4b8a8", name: "theme-color" },
    ],
  }),
  loader: async () => {
    const layout = readRootLayout();
    const [bundle, formState] = await Promise.all([requireActiveNewsletterLegalBundle(), getServerFormState()]);
    return { bundle, formState, layout };
  },
  shellComponent: RootDocument,
});

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function RootDocument({ children }: React.PropsWithChildren) {
  const { bundle, formState, layout } = Route.useLoaderData();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 1);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="group/body" data-scrolled={isScrolled ? "" : undefined}>
        <TooltipProvider>
          <GridBackground />
          <Header {...layout} />
          <main className="relative mt-20 flex-1 sm:mt-28 md:mt-40">{children}</main>
          <Hydrate when={visible({ rootMargin: "800px" })} prefetch={visible({ rootMargin: "1600px" })}>
            <Newsletter bundle={bundle} formState={formState} />
          </Hydrate>
          <Footer />
        </TooltipProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
