import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// EMAILS ----------------------------------------------------------------------------------------------------------------------------------
export const zCanonicalEmail = z.string().trim().toLowerCase().pipe(z.email());
export const zCanonicalEmailValue = z.string().trim().toLowerCase().pipe(z.email("Ce champ doit être un courriel valide"));
export const zConfirmedEmailPayload = z.object({ confirmed: z.literal(true), email: zCanonicalEmail });

// REFS ------------------------------------------------------------------------------------------------------------------------------------
export const zDocRef = <T extends string>(tableName: T) => z.object({ _id: zid(tableName) });
export const zStorageRef = z.object({ storageId: zid("_storage") });

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
