import { createRouter as createTanStackRouter } from "@tanstack/solid-router";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });

  return router;
}

declare module "@tanstack/solid-router" {
  // TanStack Router requires interface-based declaration merging.
  // oxlint-disable-next-line typescript/consistent-type-definitions
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
