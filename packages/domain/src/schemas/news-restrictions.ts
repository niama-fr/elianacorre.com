import { GenericId, SystemFields } from "@confect/core";
import { Schema as S, Struct } from "effect";

// PRIMITIVES ------------------------------------------------------------------------------------------------------------------------------
const sProfileId = GenericId.GenericId("profiles");

// REASON ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsRestrictionReason = S.Literals(["permanentBounce", "spamComplaint"]);

// RESOLVED BY -----------------------------------------------------------------------------------------------------------------------------
export const sNewsRestrictionResolvedBy = S.Literals(["admin", "confirmation"]);

// RESTRICTED BY ---------------------------------------------------------------------------------------------------------------------------
export const sNewsRestrictionRestrictedBy = S.Literals(["admin", "provider"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsRestrictionFields = S.Struct({
  lastOccurredAt: S.Finite,
  profileId: sProfileId,
  reason: sNewsRestrictionReason,
  resolvedAt: S.NullOr(S.Finite),
  resolvedBy: S.NullOr(sNewsRestrictionResolvedBy),
  restrictedAt: S.Finite,
  restrictedBy: sNewsRestrictionRestrictedBy,
  version: S.Finite,
});

export const sNewsRestrictionDoc = sNewsRestrictionFields.pipe(S.fieldsAssign(SystemFields.SystemFields("newsRestrictions").fields));

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sNewsRestrictionCreate = sNewsRestrictionFields.mapFields(Struct.pick(["lastOccurredAt", "profileId", "reason"]));

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsRestrictions = {
  Create: typeof sNewsRestrictionCreate.Type;
  Doc: typeof sNewsRestrictionDoc.Type;
  Fields: typeof sNewsRestrictionFields.Type;
  Reason: typeof sNewsRestrictionReason.Type;
};
