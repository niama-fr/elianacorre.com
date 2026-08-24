import type { Ref } from "@confect/core";
import { HttpClient } from "@confect/js";
import refs from "@ec/backend/refs";
import { Effect as E } from "effect";

// REQUEST RECOVERY ------------------------------------------------------------------------------------------------------------------------
export const executeEbooksRequestRecovery = E.fn(function* (data: Ref.Args<typeof refs.public.ebooks.requestRecovery>) {
  const client = yield* HttpClient.HttpClient;
  return yield* client.mutation(refs.public.ebooks.requestRecovery, data);
});
