import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// RECOVERY FORM ---------------------------------------------------------------------------------------------------------------------------
export const sEbookRecoveryForm = S.Struct({
  email: sCanonicalEmail,
  website: S.Trim,
});
export type EbookRecoveryFormValues = typeof sEbookRecoveryForm.Type;
