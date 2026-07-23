import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { createServerFn } from "@tanstack/react-start";

import { clientEnv } from "@/config/env";

export const requireActiveNewsletterLegalBundle = createServerFn({ method: "GET" }).handler(async () => {
  const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
  return await convex.query(api.newsletterLegalBundles.requireActive);
});
