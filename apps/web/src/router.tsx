import { ConvexQueryClient } from "@convex-dev/react-query";
import { notifyManager, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { clientEnv } from "./config/env";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  if (typeof document !== "undefined") notifyManager.setScheduler(window.requestAnimationFrame);

  const convexUrl = clientEnv.VITE_CONVEX_URL;

  const convexQueryClient = new ConvexQueryClient(convexUrl, { expectAuth: true });

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: { queries: { queryFn: convexQueryClient.queryFn(), queryKeyHashFn: convexQueryClient.hashFn() } },
  });
  convexQueryClient.connect(queryClient);

  const router = createRouter({
    context: { convexQueryClient, queryClient },
    defaultErrorComponent: (err) => <p>{err.error.stack}</p>,
    defaultNotFoundComponent: () => <p>not found</p>,
    defaultPreload: "intent",
    routeTree,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({ queryClient, router });

  return router;
}
