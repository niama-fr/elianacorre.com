import type { ConvexQueryClient } from "@convex-dev/react-query";
import { ThemeProvider } from "@ec/ui/components/theme-provider";
import { TooltipProvider } from "@ec/ui/components/tooltip";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "Eliana Corré" },
      {
        content: "Artiste peintre à l'île de la Réunion vous présente l'ensemble de ses collections.",
        name: "description",
      },
      {
        content:
          "artiste peintre, Eliana Corré, tableaux personnalisés, animaux totems, art contemporain, peinture nature, œuvres sur mesure, art réconfortant, peinture animale, portfolio artiste",
        name: "keywords",
      },
      { content: "Eliana Corré", name: "author" },
      { content: "index, follow", name: "robots" },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
});

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function RootDocument({ children }: { children: React.ReactNode }) {
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
        <ThemeProvider defaultTheme="system" storageKey="theme">
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
