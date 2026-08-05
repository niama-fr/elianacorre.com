import { getGlobalStartContext } from "@tanstack/react-start";
import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";

import { applyCachePolicy } from "@/http/cache-policy";
import { getSecurityNonce } from "@/http/security-policy";

const handler = createStartHandler({
  handler: async (options) => {
    const nonce = getSecurityNonce(getGlobalStartContext());
    if (nonce) options.router.options.ssr = { ...options.router.options.ssr, nonce };
    return await defaultStreamHandler(options);
  },
});

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default createServerEntry({
  async fetch(request) {
    return applyCachePolicy(await handler(request));
  },
});
