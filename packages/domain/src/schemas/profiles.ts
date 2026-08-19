import { SystemFields } from "@confect/core";
import { Schema as S } from "effect";
import { z } from "zod";

import { zCanonicalEmail } from "./utils";

// ROLE ------------------------------------------------------------------------------------------------------------------------------------
export const sProfileRole = S.Literals(["admin", "contact", "member"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sProfileFields = S.Struct({
  email: S.optionalKey(S.String),
  firstName: S.optionalKey(S.String),
  role: sProfileRole,
});
export const sProfilePatch = S.Struct({
  email: S.optionalKey(S.String),
  firstName: S.optionalKey(S.String),
  role: S.optionalKey(sProfileRole),
});
export const sProfileDoc = sProfileFields.pipe(S.fieldsAssign(SystemFields.SystemFields("profiles").fields));

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const sProfile = sProfileDoc;

// SEED ------------------------------------------------------------------------------------------------------------------------------------
export const zProfileAdminsSeed = z
  .string()
  .trim()
  .transform((input, { issues }): unknown => {
    try {
      return JSON.parse(input);
    } catch {
      issues.push({ code: "custom", input, message: "Invalid JSON" });
      return z.NEVER;
    }
  })
  .pipe(zCanonicalEmail.array().min(1));

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Profiles = {
  Doc: typeof sProfileDoc.Type;
  Entity: typeof sProfile.Type;
  Fields: typeof sProfileFields.Type;
  Role: typeof sProfileRole.Type;
};
