import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Effect as E, Schema as S } from "effect";

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookRecoveryRequestValues = S.Struct({
  email: sCanonicalEmail,
  website: S.Trim,
});

// REQUEST ---------------------------------------------------------------------------------------------------------------------------------
export const sEbookRecoveryRequest = S.Struct({
  email: sCanonicalEmail,
  website: S.Trim.pipe(S.withDecodingDefault(E.succeed(""))),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookRecoveries = {
  Request: typeof sEbookRecoveryRequest.Type;
  RequestValues: typeof sEbookRecoveryRequestValues.Type;
};
