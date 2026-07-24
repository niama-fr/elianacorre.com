import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zNewsSubscriptionUpsertValues, type NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import { createServerValidate, ServerValidateError } from "@tanstack/react-form-start";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { clientEnv } from "@/config/env";
import { newsletterFormOptions } from "@/lib/newsletter/newsletter.form";

import { executeNewsletterSubscribe } from "./newsletter.server";

// CONFIRM ---------------------------------------------------------------------------------------------------------------------------------
export const confirmNewsletter = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.newsletter.confirm, data);
  });

// SUBSCRIBE -------------------------------------------------------------------------------------------------------------------------------
const validateNewsletterSubscribeForm = createServerValidate({
  ...newsletterFormOptions,
  onServerValidate: zNewsSubscriptionUpsertValues,
});

export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .validator(zNewsSubscriptionUpsertValues)
  .handler(async ({ data }) => await executeNewsletterSubscribe(data));

export const submitNewsletterSubscribeForm = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Invalid newsletter form data");
    return data;
  })
  .handler(async ({ data }) => {
    try {
      const values = (await validateNewsletterSubscribeForm(data, { booleans: ["consent"] })) as NewsSubscriptions["UpsertValues"];
      await executeNewsletterSubscribe(values);
      return new Response(null, { headers: { Location: getRequestHeader("referer") ?? "/" }, status: 303 });
    } catch (error) {
      if (error instanceof ServerValidateError) return error.response;
      throw error;
    }
  });
