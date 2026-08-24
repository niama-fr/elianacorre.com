import { ServerValidateError } from "@tanstack/react-form-start";
import { createServerFn } from "@tanstack/react-start";
import { Effect as E, Schema as S } from "effect";

import { HttpClientLive } from "@/infra/confect/http-client";

import { sNewsletterConfirm, sNewsletterSubscribe } from "./newsletter.schemas";
import { executeNewsletterConfirm, executeNewsletterSubscribe, executeNewsletterSubscribeForm } from "./newsletter.server";

// CONFIRM ---------------------------------------------------------------------------------------------------------------------------------
export const confirmNewsletter = createServerFn({ method: "POST" })
  .validator(S.toStandardSchemaV1(sNewsletterConfirm))
  .handler(async ({ data }) => await E.runPromise(executeNewsletterConfirm(data).pipe(E.provide(HttpClientLive))));

// SUBSCRIBE -------------------------------------------------------------------------------------------------------------------------------
export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .validator(S.toStandardSchemaV1(sNewsletterSubscribe))
  .handler(async ({ data }) => await E.runPromise(executeNewsletterSubscribe(data).pipe(E.provide(HttpClientLive))));

export const submitNewsletterSubscribeForm = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Invalid newsletter form data");
    return data;
  })
  .handler(
    async ({ data }) =>
      await E.runPromise(
        executeNewsletterSubscribeForm(data).pipe(
          E.catch((error) => (error instanceof ServerValidateError ? E.succeed(error.response) : E.fail(error))),
          E.provide(HttpClientLive)
        )
      )
  );
