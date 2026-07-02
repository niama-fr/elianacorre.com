import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zNewsletterSubscriptionValues } from "@ec/domain/schemas/newsletter";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientEnv } from "@/config/env";

export const requestNewsletterSubscription = createServerFn({ method: "POST" })
  .validator(zNewsletterSubscriptionValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.newsletter.requestSubscription, data);
  });

export const confirmNewsletterSubscription = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.newsletter.confirmSubscription, data);
  });
