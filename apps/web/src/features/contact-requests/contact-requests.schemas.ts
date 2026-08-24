import { sCanonicalEmail, sTrimRequired } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// FORM ------------------------------------------------------------------------------------------------------------------------------------
export const sContactRequestForm = S.Struct({
  email: sCanonicalEmail,
  firstName: sTrimRequired,
  message: sTrimRequired,
  website: S.Trim,
});
export type ContactRequestFormValues = typeof sContactRequestForm.Type;
