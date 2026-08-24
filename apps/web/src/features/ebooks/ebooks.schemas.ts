import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// REQUEST RECOVERY ------------------------------------------------------------------------------------------------------------------------
export const sEbookRequestRecovery = S.Struct({
  email: sCanonicalEmail,
  website: S.Trim,
});
export type EbookRequestRecovery = typeof sEbookRequestRecovery.Type;
