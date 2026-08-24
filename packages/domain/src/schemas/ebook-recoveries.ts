import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Effect as E, Schema as S } from "effect";

// REQUEST ---------------------------------------------------------------------------------------------------------------------------------
export const sEbookRecoveryRequest = S.Struct({
  email: sCanonicalEmail,
  website: S.Trim.pipe(S.withDecodingDefault(E.succeed(""))),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookRecoveries = {
  Request: typeof sEbookRecoveryRequest.Type;
};
