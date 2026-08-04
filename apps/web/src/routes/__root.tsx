import { readRootLayout } from "@ec/domain/helpers/layouts";
import { CACHE_ROUTE_HEADERS } from "@ec/http/cache-policy";
import { GridBackground } from "@ec/ui/components/grid-background";
import { Toaster } from "@ec/ui/components/sonner";
import { TooltipProvider } from "@ec/ui/components/tooltip";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import { Hydrate } from "@tanstack/react-start";
import { visible } from "@tanstack/react-start/hydration";
import { useEffect, useState } from "react";

import { getServerFormState } from "@/lib/form/form.functions";
import { requireActivePrivacyNotice } from "@/lib/legal-texts/legal-texts.functions";
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
  headers: () => CACHE_ROUTE_HEADERS.publicHtml,
  loader: async () => {
    const layout = readRootLayout();
    const [privacyNotice, formState] = await Promise.all([requireActivePrivacyNotice(), getServerFormState()]);
    return { formState, layout, privacyNotice };
  },
  shellComponent: RootDocument,
});

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function RootDocument({ children }: React.PropsWithChildren) {
  const { formState, layout, privacyNotice } = Route.useLoaderData();
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
            <Newsletter formState={formState} privacyNoticeId={privacyNotice._id} />
          </Hydrate>
          <Footer />
        </TooltipProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
