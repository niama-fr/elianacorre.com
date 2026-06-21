import { createRouter as createTanStackRouter } from "@tanstack/solid-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,

    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
}

declare module "@tanstack/solid-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router requires interface-based module augmentation.
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
