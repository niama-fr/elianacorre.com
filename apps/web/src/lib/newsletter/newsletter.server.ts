import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import type { NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import { getRequestIP } from "@tanstack/react-start/server";

import { clientEnv } from "@/config/env";

// SUBSCRIBE -------------------------------------------------------------------------------------------------------------------------------
export async function executeNewsletterSubscribe(values: NewsSubscriptions["UpsertValues"]) {
  const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
  return await convex.mutation(api.newsletter.subscribe, { ...values, requestIp: getRequestIP({ xForwardedFor: true }) ?? "unknown" });
}
