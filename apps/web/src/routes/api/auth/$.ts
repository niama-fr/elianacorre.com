import { createFileRoute } from "@tanstack/react-router";

import { handler } from "@/lib/auth/index.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => await handler(request),
      POST: async ({ request }) => await handler(request),
    },
  },
});
