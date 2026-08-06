import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env, exports } from "cloudflare:workers";

import { applyCachePolicy, isPublicCacheCandidate } from "@/http/cache-policy";
import { handlePrivacyNoticeRevalidation } from "@/http/cache-revalidation";
import { applySecurityPolicy } from "@/http/security-policy";

export { CachedApp } from "@/http/cached-app";

// GATEWAY ---------------------------------------------------------------------------------------------------------------------------------
export default createServerEntry({
  async fetch(request) {
    try {
      const opts = { purge: async () => await exports.CachedApp.purgePrivacyNotice(), request, secret: env.CACHE_REVALIDATION_SECRET };
      const revalidationResponse = await handlePrivacyNoticeRevalidation(opts);
      if (revalidationResponse) return applySecurityPolicy(revalidationResponse);

      return isPublicCacheCandidate(request)
        ? await exports.CachedApp.fetch(request)
        : applyCachePolicy({ request, response: applySecurityPolicy(await handler.fetch(request)) });
    } catch (error) {
      // oxlint-disable-next-line no-console -- Worker failures need structured operational evidence.
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          message: "Public request failed",
          path: new URL(request.url).pathname,
        })
      );
      return applyCachePolicy({ request, response: applySecurityPolicy(new Response(null, { status: 500 })) });
    }
  },
});
