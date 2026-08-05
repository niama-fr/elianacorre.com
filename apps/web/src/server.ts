import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env, exports } from "cloudflare:workers";

import { applyCachePolicy, isPublicCacheCandidate } from "@/http/cache-policy";
import { handlePrivacyNoticeRevalidation } from "@/http/cache-revalidation";
import { applySecurityHeaders, resolveSecurityPolicyMode } from "@/http/security-policy";

export { CachedApp } from "@/http/cached-app";

// GATEWAY ---------------------------------------------------------------------------------------------------------------------------------
export default createServerEntry({
  async fetch(req) {
    const securityPolicyMode = resolveSecurityPolicyMode(env.CSP_MODE);

    try {
      const opts = { purge: async () => await exports.CachedApp.purgePrivacyNotice(), request: req, secret: env.CACHE_REVALIDATION_SECRET };
      const revalidationResponse = await handlePrivacyNoticeRevalidation(opts);
      if (revalidationResponse) return applySecurityHeaders(req, revalidationResponse, securityPolicyMode);

      return isPublicCacheCandidate(req) ? await exports.CachedApp.fetch(req) : applyCachePolicy(req, await handler.fetch(req));
    } catch (error) {
      // oxlint-disable-next-line no-console -- Worker failures need structured operational evidence.
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          message: "Public request failed",
          path: new URL(req.url).pathname,
        })
      );
      return applyCachePolicy(req, applySecurityHeaders(req, new Response(null, { status: 500 }), securityPolicyMode));
    }
  },
});
