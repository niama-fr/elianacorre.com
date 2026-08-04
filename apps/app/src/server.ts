import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { applyCachePolicy } from "@/http/cache-policy";

// MAIN ------------------------------------------------------------------------------------------------------------------------------------
export default createServerEntry({
  async fetch(request) {
    return applyCachePolicy(await handler.fetch(request));
  },
});
