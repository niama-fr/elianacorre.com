import { createFileRoute } from "@tanstack/react-router";

import { SITE_ORIGIN } from "@/lib/seo";

export const createRobotsText = () =>
  `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /connexion\nDisallow: /newsletter/\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;

export const createRobotsResponse = () =>
  new Response(createRobotsText(), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
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
