import { sCanonicalEmail, sTrimRequired } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sContactRequestCreate = S.toStandardSchemaV1(
  S.Struct({
    email: S.toStandardSchemaV1(sCanonicalEmail),
    firstName: S.toStandardSchemaV1(sTrimRequired),
    message: S.toStandardSchemaV1(sTrimRequired),
    website: S.toStandardSchemaV1(S.Trim),
  })
);
export type ContactRequestCreate = typeof sContactRequestCreate.Type;
