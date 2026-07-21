import { createFileRoute } from "@tanstack/react-router";

import { createSitemapXml } from "@/lib/seo";

export const createSitemapResponse = () =>
  new Response(createSitemapXml(), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: createSitemapResponse,
    },
  },
});
