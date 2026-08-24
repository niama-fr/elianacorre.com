import { createServerFn } from "@tanstack/react-start";
import { Effect as E, Schema as S } from "effect";

import { HttpClientLive } from "@/infra/confect/http-client";

import { sEbookRecoveryForm } from "./ebooks.schemas";
import { executeEbooksRequestRecovery } from "./ebooks.server";

// REQUEST RECOVERY ------------------------------------------------------------------------------------------------------------------------
export const requestEbookRecovery = createServerFn({ method: "POST" })
  .validator(S.toStandardSchemaV1(sEbookRecoveryForm))
  .handler(async ({ data }) => await E.runPromise(executeEbooksRequestRecovery(data).pipe(E.provide(HttpClientLive))));
