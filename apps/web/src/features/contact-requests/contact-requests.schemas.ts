import { sCanonicalEmail, sTrimRequired } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const sContactRequestCreate = S.Struct({
  email: sCanonicalEmail,
  firstName: sTrimRequired,
  message: sTrimRequired,
  website: S.Trim,
});
export type ContactRequestCreate = typeof sContactRequestCreate.Type;
