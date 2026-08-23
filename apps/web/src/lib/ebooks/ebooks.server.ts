import { HttpClient } from "@confect/js";
import refs from "@ec/backend/refs";
import type { EbookRecoveries } from "@ec/domain/schemas/ebook-recoveries";
import { getRequestIP } from "@tanstack/react-start/server";
import { Effect as E } from "effect";

// REQUEST RECOVERY ------------------------------------------------------------------------------------------------------------------------
export const executeEbooksRequestRecovery = E.fn(function* (data: EbookRecoveries["RequestValues"]) {
  const client = yield* HttpClient.HttpClient;
  return yield* client.mutation(refs.public.ebooks.requestRecovery, {
    ...data,
    requestIp: getRequestIP({ xForwardedFor: true }) ?? "unknown",
  });
});
