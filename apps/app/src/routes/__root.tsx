import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { CACHE_ROUTE_HEADERS } from "@ec/http/cache-policy";
import { Toaster } from "@ec/ui/components/sonner";
import { ThemeProvider } from "@ec/ui/components/theme-provider";
import { TooltipProvider } from "@ec/ui/components/tooltip";
import { CSPProvider } from "@ec/ui/providers/csp";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext, useRouter } from "@tanstack/react-router";

import { fetchToken } from "@/lib/auth/auth.functions";
import { authClient } from "@/lib/auth/client";

import appCss from "@/styles.css?url";

// ROUTE -----------------------------------------------------------------------------------------------------------------------------------
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
  token: string | undefined;
}>()({
  beforeLoad: async (ctx) => {
    const token = await fetchToken();
    if (token) ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    return { token };
  },
  head: () => ({
    links: [{ href: appCss, rel: "stylesheet" }],
    meta: [{ charSet: "utf-8" }, { content: "width=device-width, initial-scale=1", name: "viewport" }, { title: "TanStack Start Starter" }],
  }),
  headers: () => CACHE_ROUTE_HEADERS.private,
  shellComponent: RootDocument,
});

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function RootDocument({ children }: React.PropsWithChildren) {
  const { convexQueryClient, token } = Route.useRouteContext();
  const nonce = useRouter().options.ssr?.nonce;

  return (
    // @ts-expect-error -- The documented client construction is incompatible with the package's AuthClient type under TypeScript 6.
    <ConvexBetterAuthProvider client={convexQueryClient.convexClient} authClient={authClient} initialToken={token}>
      <CSPProvider nonce={nonce}>
        <html lang="fr" suppressHydrationWarning>
          <head>
            <HeadContent />
          </head>
          <body>
            <ThemeProvider defaultTheme="system" storageKey="theme">
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </ThemeProvider>
            <Scripts />
          </body>
        </html>
      </CSPProvider>
    </ConvexBetterAuthProvider>
  );
}
