import type { Id } from "@ec/backend/types";
import type { Identities } from "@ec/domain/schemas/identities";
import { Effect as E } from "effect";

import { DatabaseReader, DatabaseWriter } from "../confect/_generated/services";
import { dieOnEncodeError, optionByIndex } from "./confect";

// CONST -----------------------------------------------------------------------------------------------------------------------------------
const AUTH_ADAPTER = "better-auth";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getIdentityByAdapterId = E.fn("getIdentityByAdapterId")(function* (adapterId: string) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("identities").get("by_adapter_and_adapter_id", AUTH_ADAPTER, adapterId).pipe(optionByIndex);
});

export const getIdentityByProfileId = E.fn("getIdentityByProfileId")(function* (profileId: Id<"profiles">) {
  const reader = yield* DatabaseReader;
  return yield* reader.table("identities").get("by_profile_id_and_adapter", profileId, AUTH_ADAPTER).pipe(optionByIndex);
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const createIdentity = E.fn("createIdentity")(function* (create: Omit<Identities["Fields"], "adapter">) {
  const writer = yield* DatabaseWriter;
  return yield* writer
    .table("identities")
    .insert({ adapter: AUTH_ADAPTER, ...create })
    .pipe(dieOnEncodeError);
});
