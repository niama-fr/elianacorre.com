import type { Ref } from "@confect/core";
import { HttpClient } from "@confect/js";
import refs from "@ec/backend/refs";
import { NewsSubscriptionValidationFailure } from "@ec/domain/errors/news-subscriptions";
import { sNewsSubscriptionUpsertValues, type NewsSubscriptions } from "@ec/domain/schemas/news-subscriptions";
import { createServerValidate, ServerValidateError } from "@tanstack/react-form-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { Effect as E, Option as O } from "effect";

import { newsletterFormOptions } from "./newsletter.form";

// CONFIRM ---------------------------------------------------------------------------------------------------------------------------------
export const executeNewsletterConfirm = E.fn(function* (data: Ref.Args<typeof refs.public.newsletter.confirm>) {
  const client = yield* HttpClient.HttpClient;
  const { confirmed, downloadToken } = yield* client.mutation(refs.public.newsletter.confirm, data);
  return { confirmed, downloadToken: O.getOrNull(downloadToken) };
});

// SUBSCRIBE -------------------------------------------------------------------------------------------------------------------------------
const validateNewsletterSubscribeForm = createServerValidate({
  ...newsletterFormOptions,
  onServerValidate: sNewsSubscriptionUpsertValues,
});

export const executeNewsletterSubscribe = E.fn(function* (values: NewsSubscriptions["UpsertValues"]) {
  const client = yield* HttpClient.HttpClient;
  return yield* client.mutation(refs.public.newsletter.subscribe, {
    ...values,
    requestIp: getRequestIP({ xForwardedFor: true }) ?? "unknown",
  });
});

export const executeNewsletterSubscribeForm = E.fn(function* (data: FormData) {
  const values = yield* E.tryPromise({
    catch: (error) => (error instanceof ServerValidateError ? error : new NewsSubscriptionValidationFailure({ cause: error })),
    try: async () => (await validateNewsletterSubscribeForm(data, { booleans: ["consent"] })) as NewsSubscriptions["UpsertValues"],
  });
  yield* executeNewsletterSubscribe(values);
  return new Response(null, { headers: { Location: getRequestHeader("referer") ?? "/" }, status: 303 });
});
