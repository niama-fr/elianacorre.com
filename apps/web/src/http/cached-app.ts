import handler from "@tanstack/react-start/server-entry";
import { WorkerEntrypoint } from "cloudflare:workers";

import { applyCachePolicy } from "./cache-policy";
import { PRIVACY_NOTICE_CACHE_TAG } from "./cache-revalidation";

// ENTRYPOINT ------------------------------------------------------------------------------------------------------------------------------
export class CachedApp extends WorkerEntrypoint {
  // Cloudflare requires fetch to be an instance entrypoint even though rendering does not access instance state.
  // oxlint-disable-next-line eslint/class-methods-use-this
  override async fetch(request: Request): Promise<Response> {
    return applyCachePolicy(request, await handler.fetch(request));
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
