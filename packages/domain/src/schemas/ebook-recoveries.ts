import { sCanonicalEmail, sCanonicalEmailValue } from "@ec/domain/schemas/utils";
import { Effect as E, Schema as S } from "effect";

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const sEbookRecoveryRequestValues = S.toStandardSchemaV1(
  S.Struct({
    email: S.toStandardSchemaV1(sCanonicalEmailValue),
    website: S.toStandardSchemaV1(S.Trim),
  })
);

// REQUEST ---------------------------------------------------------------------------------------------------------------------------------
export const sEbookRecoveryRequest = S.Struct({
  email: sCanonicalEmail,
  requestIp: S.Trim.check(S.isNonEmpty()),
  website: S.Trim.pipe(S.withDecodingDefault(E.succeed(""))),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookRecoveries = {
  Request: typeof sEbookRecoveryRequest.Type;
  RequestValues: typeof sEbookRecoveryRequestValues.Type;
};
