import handler from "@tanstack/react-start/server-entry";
import { WorkerEntrypoint } from "cloudflare:workers";

import { applyCachePolicy } from "./cache-policy";
import { PRIVACY_NOTICE_CACHE_TAG } from "./cache-revalidation";
import { applySecurityPolicy } from "./security-policy";

// ENTRYPOINT ------------------------------------------------------------------------------------------------------------------------------
export class CachedApp extends WorkerEntrypoint {
  // oxlint-disable-next-line class-methods-use-this
  override async fetch(request: Request): Promise<Response> {
    try {
      return applyCachePolicy({ request, response: applySecurityPolicy(await handler.fetch(request)) });
    } catch (error) {
      // oxlint-disable-next-line no-console -- Worker failures need structured operational evidence.
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          message: "Cached app request failed",
          path: new URL(request.url).pathname,
        })
      );
      return applyCachePolicy({ request, response: applySecurityPolicy(new Response(null, { status: 500 })) });
    }
  }

  async purgePrivacyNotice(): Promise<boolean> {
    const entrypointCache = this.ctx.cache;
    if (!entrypointCache) return false;

    const result = await entrypointCache.purge({ tags: [PRIVACY_NOTICE_CACHE_TAG] });
    if (!result.success)
      // Cloudflare recommends structured error logs for operational failures.
      // oxlint-disable-next-line no-console
      console.error(JSON.stringify({ errors: result.errors, message: "Privacy notice cache purge failed" }));

    return result.success;
  }
}
