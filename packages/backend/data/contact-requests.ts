import type { Id } from "@ec/backend/types";
import type { ContactRequests } from "@ec/domain/schemas/contact-requests";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnDecodeError, dieOnEncodeError } from "./confect";

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const takeProfileContactRequests = E.fn(function* (limit: number, profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader
    .table("contactRequests")
    .index("by_profile_id", (q) => q.eq("profileId", profileId))
    .take(limit)
    .pipe(dieOnDecodeError);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createContactRequest = E.fn(function* (create: ContactRequests["Create"]) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("contactRequests").insert(create).pipe(dieOnEncodeError);
});

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteContactRequest = E.fn(function* (id: Id<"contactRequests">) {
  const writer = yield* DatabaseWriter;
  return yield* writer.table("contactRequests").delete(id);
});
