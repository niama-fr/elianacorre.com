import type { Ref } from "@confect/core";
import { HttpClient } from "@confect/js";
import refs from "@ec/backend/refs";
import { Effect as E } from "effect";

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const executeContactRequestsCreate = E.fn(function* (data: Ref.Args<typeof refs.public.contactRequests.create>) {
  const client = yield* HttpClient.HttpClient;
  return yield* client.mutation(refs.public.contactRequests.create, data);
});
