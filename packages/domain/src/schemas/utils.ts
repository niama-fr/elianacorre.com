import { zid } from "convex-helpers/server/zod4";
import { Schema as S, SchemaTransformation as ST } from "effect";
import { z } from "zod";

// STRINGS ---------------------------------------------------------------------------------------------------------------------------------
export const sOptionalTrim = S.Trim.pipe(
  S.decodeTo(S.UndefinedOr(S.Trimmed), ST.transform({ decode: (s) => (s === "" ? undefined : s), encode: (s) => s ?? "" }))
);

// EMAILS ----------------------------------------------------------------------------------------------------------------------------------
const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)(?<local>[A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@(?<domain>[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/u;

export const sCanonicalEmailValue = S.Trim.pipe(S.decode(ST.toLowerCase())).check(
  S.isPattern(EMAIL_PATTERN, { message: "Ce courriel est invalide" })
);

export const sCanonicalEmail = S.Trim.pipe(S.decode(ST.toLowerCase())).check(S.isPattern(EMAIL_PATTERN));

export const sConfirmedEmailPayload = S.Struct({
  confirmed: S.Literal(true),
  email: sCanonicalEmail,
});

// REFS ------------------------------------------------------------------------------------------------------------------------------------
export const zDocRef = <T extends string>(tableName: T) => z.object({ _id: zid(tableName) });
export const zStorageRef = z.object({ storageId: zid("_storage") });

// PAGINATION ------------------------------------------------------------------------------------------------------------------------------
export const sPaginationOptions = S.Struct({
  cursor: S.NullOr(S.String),
  endCursor: S.optionalKey(S.NullOr(S.String)),
  id: S.optionalKey(S.Finite),
  maximumBytesRead: S.optionalKey(S.Finite),
  maximumRowsRead: S.optionalKey(S.Finite),
  numItems: S.Finite,
});

// COMMON ----------------------------------------------------------------------------------------------------------------------------------
export const zDocCommon = <T extends string>(tableName: T) =>
  z.object({
    ...zDocRef(tableName).shape,
    _creationTime: z.number(),
  });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type DocCommon<T extends string> = z.infer<ReturnType<typeof zDocCommon<T>>>;
export type DocRef<T extends string> = z.infer<ReturnType<typeof zDocRef<T>>>;
export type StorageRef = z.infer<typeof zStorageRef>;
export type WithNow<T = object> = { now: number } & T;
