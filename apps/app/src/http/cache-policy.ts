import { CACHE_CONTROL, CACHE_HEADER } from "@ec/http/cache-policy";
import { HTTP_HEADER } from "@ec/http/headers";

// APPLY -----------------------------------------------------------------------------------------------------------------------------------
export const applyCachePolicy = ({ response }: { response: Response }): Response => {
  const headers = new Headers(response.headers);
  headers.set(HTTP_HEADER.cacheControl, CACHE_CONTROL.privateNoStore);
  headers.set(CACHE_HEADER.edgeControl, CACHE_CONTROL.noStore);
  return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
};
