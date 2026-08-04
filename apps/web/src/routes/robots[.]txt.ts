import { CACHE_ROUTE_HEADERS } from "@ec/http/cache-policy";
import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/seo/head";

export const createRobotsText = () =>
  `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /connexion\nDisallow: /newsletter/\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;

export const createRobotsResponse = () =>
  new Response(createRobotsText(), {
    headers: {
      ...CACHE_ROUTE_HEADERS.publicDiscovery,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: createRobotsResponse,
    },
  },
});
