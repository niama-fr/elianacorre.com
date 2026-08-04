import { CACHE_ROUTE_HEADERS } from "@ec/http/cache-policy";
import { createFileRoute } from "@tanstack/react-router";

import { createSitemapXml } from "@/seo/discovery";

export const createSitemapResponse = () =>
  new Response(createSitemapXml(), {
    headers: {
      ...CACHE_ROUTE_HEADERS.publicDiscovery,
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
