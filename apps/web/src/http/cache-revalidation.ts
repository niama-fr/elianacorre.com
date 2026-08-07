import { CACHE_CONTROL } from "@ec/http/cache-policy";
import { PRIVACY_NOTICE_REVALIDATION_PATH } from "@ec/http/cache-revalidation";
import { HTTP_HEADER } from "@ec/http/headers";

export { PRIVACY_NOTICE_CACHE_TAG, PRIVACY_NOTICE_REVALIDATION_PATH } from "@ec/http/cache-revalidation";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const PRIVATE_RESPONSE_HEADERS = { [HTTP_HEADER.cacheControl]: CACHE_CONTROL.privateNoStore };

// HANDLE ----------------------------------------------------------------------------------------------------------------------------------
export const handlePrivacyNoticeRevalidation = async ({ purge, request, secret }: PrivacyNoticeOpts): Promise<Response | null> => {
  if (new URL(request.url).pathname !== PRIVACY_NOTICE_REVALIDATION_PATH) return null;

  if (request.method !== "POST")
    return new Response(null, { headers: { ...PRIVATE_RESPONSE_HEADERS, [HTTP_HEADER.allow]: "POST" }, status: 405 });

  if (!secret || request.headers.get(HTTP_HEADER.authorization) !== `Bearer ${secret}`)
    return new Response(null, { headers: { ...PRIVATE_RESPONSE_HEADERS, [HTTP_HEADER.wwwAuthenticate]: "Bearer" }, status: 401 });

  try {
    const purged = await purge();
    return Response.json({ revalidated: purged }, { headers: PRIVATE_RESPONSE_HEADERS, status: purged ? 200 : 500 });
  } catch (error) {
    // oxlint-disable-next-line no-console -- Purge failures need structured operational evidence.
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        message: "Privacy notice revalidation failed",
      })
    );
    return Response.json({ revalidated: false }, { headers: PRIVATE_RESPONSE_HEADERS, status: 500 });
  }
};

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
type PrivacyNoticeOpts = { purge: () => Promise<boolean>; request: Request; secret: string | undefined };
