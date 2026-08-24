import { createFileRoute } from "@tanstack/react-router";

import { handler } from "@/infra/auth/auth.server";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => await handler(request),
      POST: async ({ request }) => await handler(request),
    },
  },
});
