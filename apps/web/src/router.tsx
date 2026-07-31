import { createRouter } from "@tanstack/react-router";

import { NotFoundPage } from "./routes/-not-found";
import { SafeErrorPage } from "./routes/-safe-error";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    defaultErrorComponent: SafeErrorPage,
    defaultNotFoundComponent: NotFoundPage,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });
}
