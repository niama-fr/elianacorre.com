import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { Toaster } from "@ec/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth/client";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createRootRouteWithContext<{ queryClient: QueryClient; convexQueryClient: ConvexQueryClient }>()({
  head: () => ({
    links: [
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
  shellComponent: RootDocument,
});

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function RootDocument({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { convexQueryClient } = Route.useRouteContext();

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
    <ConvexBetterAuthProvider client={convexQueryClient.convexClient} authClient={authClient}>
      <html lang="fr" suppressHydrationWarning>
        <head>
          <HeadContent />
        </head>
        <body className="group/body" data-scrolled={isScrolled ? "" : undefined}>
          {children}
          <Toaster />
          <Scripts />
        </body>
      </html>
    </ConvexBetterAuthProvider>
  );
}
