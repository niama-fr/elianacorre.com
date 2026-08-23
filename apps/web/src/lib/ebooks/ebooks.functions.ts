import { sEbookRecoveryRequestValues } from "@ec/domain/schemas/ebook-recoveries";
import { createServerFn } from "@tanstack/react-start";
import { Effect as E } from "effect";

import { HttpClientLive } from "@/lib/confect/http-client";

import { executeEbooksRequestRecovery } from "./ebooks.server";

// REQUEST RECOVERY ------------------------------------------------------------------------------------------------------------------------
export const requestEbookRecovery = createServerFn({ method: "POST" })
  .validator(sEbookRecoveryRequestValues)
  .handler(async ({ data }) => await E.runPromise(executeEbooksRequestRecovery(data).pipe(E.provide(HttpClientLive))));
