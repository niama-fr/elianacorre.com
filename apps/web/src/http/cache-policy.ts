import { CACHE_CONTROL, CACHE_HEADER, CACHE_INTENT } from "@ec/http/cache-policy";
import { HTTP_HEADER } from "@ec/http/headers";

import { PRIVACY_NOTICE_CACHE_TAG } from "./cache-revalidation";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const PRIVATE_CAPABILITY_PATHS = new Set(["/newsletter/confirmation", "/newsletter/ebook"]);

// PREDICATES ------------------------------------------------------------------------------------------------------------------------------
export const isPublicCacheCandidate = (request: Request): boolean => isAnonymousCacheSafeRequest(request);

// INTERNAL --------------------------------------------------------------------------------------------------------------------------------
function isAnonymousCacheSafeRequest(request: Request): boolean {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (request.headers.has(HTTP_HEADER.authorization) || request.headers.has(HTTP_HEADER.cookie)) return false;

  const url = new URL(request.url);
  const pathname = url.pathname === "/" ? url.pathname : url.pathname.replace(/\/+$/u, "");
  return !url.searchParams.has("token") && !PRIVATE_CAPABILITY_PATHS.has(pathname);
}

// APPLY -----------------------------------------------------------------------------------------------------------------------------------
export const applyCachePolicy = (request: Request, response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set(HTTP_HEADER.cacheControl, CACHE_CONTROL.privateNoStore);
  headers.delete(CACHE_HEADER.edgeControl);
  headers.delete(CACHE_HEADER.tag);
  headers.delete(CACHE_HEADER.intent);

  if (isCacheableDiscoveryResponse(request, response)) {
    const cacheControl = response.headers.get(HTTP_HEADER.cacheControl);
    if (cacheControl) {
      headers.set(HTTP_HEADER.cacheControl, cacheControl);
      headers.set(CACHE_HEADER.edgeControl, cacheControl);
    }
  } else if (isCacheableHtmlResponse(request, response)) {
    headers.set(CACHE_HEADER.edgeControl, CACHE_CONTROL.publicHtml);
    headers.set(CACHE_HEADER.tag, PRIVACY_NOTICE_CACHE_TAG);
  }

  return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
};

function isCacheableDiscoveryResponse(request: Request, response: Response): boolean {
  if (!isAnonymousCacheSafeRequest(request)) return false;
  if (response.status !== 200 || response.headers.has(HTTP_HEADER.setCookie)) return false;
  return response.headers.get(CACHE_HEADER.intent) === CACHE_INTENT.publicDiscovery && response.headers.has(HTTP_HEADER.cacheControl);
}

function isCacheableHtmlResponse(request: Request, response: Response): boolean {
  if (!isAnonymousCacheSafeRequest(request)) return false;
  if (response.status !== 200 || response.headers.has(HTTP_HEADER.setCookie)) return false;
  if (response.headers.get(CACHE_HEADER.intent) !== CACHE_INTENT.publicHtml) return false;

  return response.headers.get(HTTP_HEADER.contentType)?.toLowerCase().startsWith("text/html") === true;
}
