import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zNewsletterSubCreateValues } from "@ec/domain/schemas/newsletter-subs";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientEnv } from "@/config/env";

export const confirmNewsletterSub = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.newsletterSubs.confirm, data);
  });

export const upsertNewsletterSub = createServerFn({ method: "POST" })
  .validator(zNewsletterSubCreateValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.newsletterSubs.upsert, data);
  });
