import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth/client";
import { fetchToken } from "@/lib/auth/functions";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createRootRouteWithContext<{ queryClient: QueryClient; convexQueryClient: ConvexQueryClient }>()({
  beforeLoad: async (ctx) => {
    const token = await fetchToken();
    if (token !== undefined) ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    return { token };
  },
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
  shellComponent: RootDocument,
});

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function RootDocument({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { convexQueryClient, token } = Route.useRouteContext();

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
    // @ts-expect-error -- The documented client construction is incompatible with the package's AuthClient type under TypeScript 6.
    <ConvexBetterAuthProvider client={convexQueryClient.convexClient} authClient={authClient} initialToken={token}>
      <html lang="fr" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body className="group/body" data-scrolled={isScrolled ? "" : undefined}>
          {children}
          <Scripts />
        </body>
      </html>
    </ConvexBetterAuthProvider>
  );
}
