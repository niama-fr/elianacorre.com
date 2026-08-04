import { HTTP_HEADER } from "./headers";

// HEADER NAMES ----------------------------------------------------------------------------------------------------------------------------
export const CACHE_HEADER = {
  edgeControl: "Cloudflare-CDN-Cache-Control",
  intent: "X-EC-Cache-Intent",
  tag: "Cache-Tag",
} as const;

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const CACHE_CONTROL = {
  noStore: "no-store",
  privateNoStore: "private, no-store",
  publicDiscovery: "public, max-age=3600, stale-while-revalidate=86400",
  publicHtml: "public, max-age=3600, stale-while-revalidate=300",
} as const;

export const CACHE_INTENT = {
  private: "private",
  publicDiscovery: "public-discovery",
  publicHtml: "public-html",
} as const;

// ROUTE DECLARATIONS -----------------------------------------------------------------------------------------------------------------------
export const CACHE_ROUTE_HEADERS = {
  private: {
    [CACHE_HEADER.intent]: CACHE_INTENT.private,
  },
  publicDiscovery: {
    [HTTP_HEADER.cacheControl]: CACHE_CONTROL.publicDiscovery,
    [CACHE_HEADER.intent]: CACHE_INTENT.publicDiscovery,
  },
  publicHtml: {
    [CACHE_HEADER.intent]: CACHE_INTENT.publicHtml,
  },
} as const;
