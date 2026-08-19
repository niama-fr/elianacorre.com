import { zid } from "convex-helpers/server/zod4";
import { Schema as S, SchemaGetter } from "effect";
import { z } from "zod";

// EMAILS ----------------------------------------------------------------------------------------------------------------------------------
export const zCanonicalEmail = z.string().trim().toLowerCase().pipe(z.email());
export const zCanonicalEmailValue = z.string().trim().toLowerCase().pipe(z.email("Ce courriel est invalide"));
export const zConfirmedEmailPayload = z.object({ confirmed: z.literal(true), email: zCanonicalEmail });

const sCanonicalEmailValue = S.String.check(S.isLowercased(), S.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/u));
export const sCanonicalEmail = S.Trim.pipe(
  S.decodeTo(sCanonicalEmailValue, {
    decode: SchemaGetter.transform((email) => email.toLowerCase()),
    encode: SchemaGetter.transform((email) => email),
  })
);

// REFS ------------------------------------------------------------------------------------------------------------------------------------
export const zDocRef = <T extends string>(tableName: T) => z.object({ _id: zid(tableName) });
export const zStorageRef = z.object({ storageId: zid("_storage") });

// PAGINATION ------------------------------------------------------------------------------------------------------------------------------
export const zPaginationOptions = z.object({
  cursor: z.string().nullable(),
  endCursor: z.string().nullable().optional(),
  id: z.number().optional(),
  maximumBytesRead: z.number().optional(),
  maximumRowsRead: z.number().optional(),
  numItems: z.number(),
});
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
