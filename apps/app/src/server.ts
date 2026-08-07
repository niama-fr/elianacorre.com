import { getGlobalStartContext } from "@tanstack/react-start";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

import { applyCachePolicy } from "@/http/cache-policy";
import { applySecurityPolicy, SECURITY_NONCE_CONTEXT_KEY } from "@/http/security-policy";

// HANDLER ---------------------------------------------------------------------------------------------------------------------------------
const handler = createStartHandler({
  handler: async (options) => {
    const nonce = getGlobalStartContext()?.[SECURITY_NONCE_CONTEXT_KEY];
    if (nonce !== undefined) options.router.update({ ssr: { ...options.router.options.ssr, nonce } });
    return await defaultStreamHandler(options);
  },
});

// GATEWAY ---------------------------------------------------------------------------------------------------------------------------------
export default createServerEntry({
  async fetch(request) {
    try {
      return applyCachePolicy({ response: await handler(request) });
    } catch (error) {
      // oxlint-disable-next-line no-console -- Worker failures need structured operational evidence.
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          message: "App request failed",
          path: new URL(request.url).pathname,
        })
      );
      return applyCachePolicy({ response: applySecurityPolicy(new Response(null, { status: 500 })) });
    }
  },
});
