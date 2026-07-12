import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zEbookRecoveryRequestValues } from "@ec/domain/schemas/ebook-recoveries";
import { zNewsSubscriptionUpsertValues } from "@ec/domain/schemas/news-subscriptions";
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

import { clientEnv } from "@/config/env";

export const confirmNewsletter = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.newsletter.confirm, data);
  });

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .validator(zNewsSubscriptionUpsertValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.newsletter.subscribe, { ...data, requestIp: getRequestIP({ xForwardedFor: true }) ?? "unknown" });
  });

export const requestEbookRecovery = createServerFn({ method: "POST" })
  .validator(zEbookRecoveryRequestValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.newsletter.requestEbookRecovery, {
      ...data,
      requestIp: getRequestIP({ xForwardedFor: true }) ?? "unknown",
    });
  });
