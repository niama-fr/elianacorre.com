import type { Ref } from "@confect/core";
import { HttpClient } from "@confect/js";
import refs from "@ec/backend/refs";
import { createServerValidate, ServerValidateError } from "@tanstack/react-form-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { Effect as E, Option as O, Schema as S } from "effect";

import { newsletterFormOptions } from "./newsletter.form";
import { sNewsletterSubscribeForm, type NewsletterSubscribeFormValues } from "./newsletter.schemas";

// ERRORS ----------------------------------------------------------------------------------------------------------------------------------
// oxlint-disable-next-line typescript/no-unsafe-call unicorn/throw-new-error
class NewsletterValidationFailure extends S.TaggedError<NewsletterValidationFailure>()("NewsletterValidationFailure", {
  cause: S.Unknown,
}) {}

// CONFIRM ---------------------------------------------------------------------------------------------------------------------------------
export const executeNewsletterConfirm = E.fn(function* (data: Ref.Args<typeof refs.public.newsletter.confirm>) {
  const client = yield* HttpClient.HttpClient;
  const { confirmed, downloadToken } = yield* client.mutation(refs.public.newsletter.confirm, data);
  return { confirmed, downloadToken: O.getOrNull(downloadToken) };
});

// SUBSCRIBE -------------------------------------------------------------------------------------------------------------------------------
const validateNewsletterSubscribeForm = createServerValidate({
  ...newsletterFormOptions,
  onServerValidate: S.toStandardSchemaV1(sNewsletterSubscribeForm),
});

export const executeNewsletterSubscribe = E.fn(function* (data: Ref.Args<typeof refs.public.newsletter.subscribe>) {
  const client = yield* HttpClient.HttpClient;
  return yield* client.mutation(refs.public.newsletter.subscribe, data);
});

export const executeNewsletterSubscribeForm = E.fn(function* (data: FormData) {
  const values = yield* E.tryPromise({
    catch: (error) => (error instanceof ServerValidateError ? error : new NewsletterValidationFailure({ cause: error })),
    try: async () => (await validateNewsletterSubscribeForm(data, { booleans: ["consent"] })) as NewsletterSubscribeFormValues,
  });
  yield* executeNewsletterSubscribe(values);
  return new Response(null, { headers: { Location: getRequestHeader("referer") ?? "/" }, status: 303 });
});
