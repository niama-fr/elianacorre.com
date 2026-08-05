import { getGlobalStartContext } from "@tanstack/react-start";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

import { applyCachePolicy } from "@/http/cache-policy";
import { applySecurityHeaders, applySecurityNonce, resolveSecurityPolicyMode } from "@/http/security-policy";

const handler = createStartHandler({
  handler: async (options) => {
    applySecurityNonce(options.router, getGlobalStartContext());
    return await defaultStreamHandler(options);
  },
});

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default createServerEntry({
  async fetch(request) {
    const securityPolicyMode = resolveSecurityPolicyMode(process.env.CSP_MODE);

    try {
      return applyCachePolicy(await handler(request));
    } catch (error) {
      // oxlint-disable-next-line no-console -- Worker failures need structured operational evidence.
      console.error(
        JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
          message: "App request failed",
          path: new URL(request.url).pathname,
        })
      );
      return applyCachePolicy(applySecurityHeaders(new Response(null, { status: 500 }), { mode: securityPolicyMode }));
    }
  },
});
