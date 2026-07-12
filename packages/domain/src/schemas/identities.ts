import { zAuthAdapter } from "@ec/domain/schemas/auth";
import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zIdentityFields = z.object({
  adapter: zAuthAdapter,
  adapterId: z.string(),
  profileId: zid("profiles"),
});
export const zIdentityDoc = z.object({ ...zDocCommon("identities").shape, ...zIdentityFields.shape });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Identities = {
  Doc: z.infer<typeof zIdentityDoc>;
  Fields: z.infer<typeof zIdentityFields>;
};
