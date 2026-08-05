import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env, exports } from "cloudflare:workers";

import { applyCachePolicy, isPublicCacheCandidate } from "@/http/cache-policy";
import { handlePrivacyNoticeRevalidation } from "@/http/cache-revalidation";
import { applySecurityHeaders, resolveSecurityPolicyMode } from "@/http/security-policy";

export { CachedApp } from "@/http/cached-app";

// GATEWAY ---------------------------------------------------------------------------------------------------------------------------------
export default createServerEntry({
  async fetch(req) {
    const opts = { purge: async () => await exports.CachedApp.purgePrivacyNotice(), request: req, secret: env.CACHE_REVALIDATION_SECRET };
    const revalidationResponse = await handlePrivacyNoticeRevalidation(opts);
    if (revalidationResponse) return applySecurityHeaders(req, revalidationResponse, resolveSecurityPolicyMode(env.CSP_MODE));

    return isPublicCacheCandidate(req) ? await exports.CachedApp.fetch(req) : applyCachePolicy(req, await handler.fetch(req));
  },
});
