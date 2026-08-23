import { sContactRequestCreateValues } from "@ec/domain/schemas/contact-requests";
import { createServerFn } from "@tanstack/react-start";
import { Effect as E } from "effect";

import { HttpClientLive } from "@/lib/confect/http-client";

import { executeContactRequestsCreate } from "./contact-requests.server";

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createContactRequest = createServerFn({ method: "POST" })
  .validator(sContactRequestCreateValues)
  .handler(async ({ data }) => await E.runPromise(executeContactRequestsCreate(data).pipe(E.provide(HttpClientLive))));
