import { readAllSets } from "@ec/domain/helpers/sets";

export const SITE_ORIGIN = "https://elianacorre.com";
export const SITE_NAME = "Eliana Corré";
export const DEFAULT_SHARE_IMAGE = "https://ik.imagekit.io/elianacorre/accueil.jpeg";

export const createNoindexHead = (title: string) => ({
  meta: [{ title }, { content: "noindex, nofollow, noarchive", name: "robots" }, { content: "no-referrer", name: "referrer" }],
});

export const INDEXABLE_PATHS = [
  "/",
  "/qui-suis-je",
  "/contact",
  "/carnets-de-voyage",
  "/confidentialite",
  "/mentions-legales",
  ...readAllSets().map(({ slug }) => `/oeuvres/${slug}`),
] as const;

export const createSitemapXml = () => {
  const urls = INDEXABLE_PATHS.map((path) => `  <url><loc>${new URL(path, SITE_ORIGIN).href}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
};

export const SECURITY_HEADERS = {
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud; font-src 'self' data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob: https://ik.imagekit.io; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; upgrade-insecure-requests",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;
