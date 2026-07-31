import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import type { ConvexQueryClient } from "@convex-dev/react-query";
import { Toaster } from "@ec/ui/components/sonner";
import { ThemeProvider } from "@ec/ui/components/theme-provider";
import { TooltipProvider } from "@ec/ui/components/tooltip";
import type { QueryClient } from "@tanstack/react-query";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";

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
  shellComponent: RootDocument,
});

// DOCUMENT --------------------------------------------------------------------------------------------------------------------------------
function RootDocument({ children }: React.PropsWithChildren) {
  const { convexQueryClient, token } = Route.useRouteContext();

  return (
    // @ts-expect-error -- The documented client construction is incompatible with the package's AuthClient type under TypeScript 6.
    <ConvexBetterAuthProvider client={convexQueryClient.convexClient} authClient={authClient} initialToken={token}>
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
    </ConvexBetterAuthProvider>
  );
}
