import { SystemFields } from "@confect/core";
import { Schema as S, Struct } from "effect";

import { sCanonicalEmail } from "./utils";

// ROLE ------------------------------------------------------------------------------------------------------------------------------------
export const sProfileRole = S.Literals(["admin", "contact", "member"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sProfileFields = S.Struct({
  email: S.optionalKey(sCanonicalEmail),
  firstName: S.optionalKey(S.String),
  role: sProfileRole,
});
export const sProfileDoc = sProfileFields.pipe(S.fieldsAssign(SystemFields.SystemFields("profiles").fields));

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const sProfile = sProfileDoc;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sProfileCreate = sProfileFields.mapFields(({ email, firstName }) => ({ email: S.requiredKey(email), firstName }));

// UPDATE ----------------------------------------------------------------------------------------------------------------------------------
export const sProfilePatch = sProfileFields.mapFields(Struct.omit(["role"])).mapFields(Struct.map(S.optional));

// SEED ------------------------------------------------------------------------------------------------------------------------------------
export const sProfileAdminsSeed = S.fromJsonString(S.Array(sCanonicalEmail).check(S.isMinLength(1)));

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Profiles = {
  Create: typeof sProfileCreate.Type;
  Doc: typeof sProfileDoc.Type;
  Entity: typeof sProfile.Type;
  Fields: typeof sProfileFields.Type;
  Patch: typeof sProfilePatch.Type;
  Role: typeof sProfileRole.Type;
};
