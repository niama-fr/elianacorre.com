import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

import { SECURITY_HEADERS } from "@/lib/seo";

export const applySecurityHeaders = (response: Response): Response => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
  return new Response(response.body, { headers, status: response.status, statusText: response.statusText });
};

export default createServerEntry({
  async fetch(request) {
    return applySecurityHeaders(await handler.fetch(request));
  },
});
