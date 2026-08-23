import { HttpClient } from "@confect/js";
import refs from "@ec/backend/refs";
import type { ContactRequests } from "@ec/domain/schemas/contact-requests";
import { Effect as E } from "effect";

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const executeContactRequestsCreate = E.fn(function* (data: ContactRequests["CreateValues"]) {
  const client = yield* HttpClient.HttpClient;
  return yield* client.mutation(refs.public.contactRequests.create, data);
});
