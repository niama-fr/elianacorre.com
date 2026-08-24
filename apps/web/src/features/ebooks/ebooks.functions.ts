import { sEbookRecoveryRequestValues } from "@ec/domain/schemas/ebook-recoveries";
import { createServerFn } from "@tanstack/react-start";
import { Effect as E, Schema as S } from "effect";

import { HttpClientLive } from "@/infra/confect/http-client";

import { executeEbooksRequestRecovery } from "./ebooks.server";

// REQUEST RECOVERY ------------------------------------------------------------------------------------------------------------------------
export const requestEbookRecovery = createServerFn({ method: "POST" })
  .validator(S.toStandardSchemaV1(sEbookRecoveryRequestValues))
  .handler(async ({ data }) => await E.runPromise(executeEbooksRequestRecovery(data).pipe(E.provide(HttpClientLive))));
