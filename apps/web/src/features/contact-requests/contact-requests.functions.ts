import { createServerFn } from "@tanstack/react-start";
import { Effect as E } from "effect";

import { HttpClientLive } from "@/infra/confect/http-client";

import { sContactRequestCreate } from "./contact-requests.schemas";
import { executeContactRequestsCreate } from "./contact-requests.server";

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createContactRequest = createServerFn({ method: "POST" })
  .validator(sContactRequestCreate)
  .handler(async ({ data }) => await E.runPromise(executeContactRequestsCreate(data).pipe(E.provide(HttpClientLive))));
