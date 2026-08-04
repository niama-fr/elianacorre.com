import { CACHE_CONTROL, CACHE_HEADER } from "@ec/http/cache-policy";
import { HTTP_HEADER } from "@ec/http/headers";

// APPLY -----------------------------------------------------------------------------------------------------------------------------------
export const applyCachePolicy = (res: Response): Response => {
  const headers = new Headers(res.headers);
  headers.set(HTTP_HEADER.cacheControl, CACHE_CONTROL.privateNoStore);
  headers.set(CACHE_HEADER.edgeControl, CACHE_CONTROL.noStore);
  return new Response(res.body, { headers, status: res.status, statusText: res.statusText });
};
