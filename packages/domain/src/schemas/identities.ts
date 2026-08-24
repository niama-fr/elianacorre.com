import { GenericId, SystemFields } from "@confect/core";
import { Schema as S } from "effect";

import { sAuthAdapter } from "./auth";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sIdentityFields = S.Struct({
  adapter: sAuthAdapter,
  adapterId: S.String,
  profileId: GenericId.GenericId("profiles"),
});
export const sIdentityDoc = sIdentityFields.pipe(S.fieldsAssign(SystemFields.SystemFields("identities").fields));

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Identities = {
  Doc: typeof sIdentityDoc.Type;
  Fields: typeof sIdentityFields.Type;
};
