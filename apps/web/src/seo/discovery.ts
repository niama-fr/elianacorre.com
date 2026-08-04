import { readAllSets } from "@ec/domain/helpers/sets";

import { SITE_ORIGIN } from "./head";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
export const INDEXABLE_PATHS = [
  "/",
  "/carnets-de-voyage",
  "/confidentialite",
  "/contact",
  "/mentions-legales",
  ...readAllSets().map(({ slug }) => `/oeuvres/${slug}`),
  "/qui-suis-je",
] as const;

// CREATE SITEMAP XML ----------------------------------------------------------------------------------------------------------------------
export const createSitemapXml = () => {
  const urls = INDEXABLE_PATHS.map((path) => `  <url><loc>${new URL(path, SITE_ORIGIN).href}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};
