import { z } from "zod/mini";

import { zDocCommon } from "./utils";

// ROLE ------------------------------------------------------------------------------------------------------------------------------------
export const zProfileRole = z.literal(["admin", "contact", "member"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zProfileFields = z.object({
  email: z.email(),
  firstName: z.optional(z.string()),
  lastName: z.optional(z.string()),
  role: zProfileRole,
  userId: z.nullable(z.string()),
});
export const zProfileDoc = z.object({ ...zDocCommon("profiles").shape, ...zProfileFields.shape });

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zProfile = zProfileDoc;

// NORMALIZATION --------------------------------------------------------------------------------------------------------------------------
export const normalizeProfileEmail = (email: string): string => z.email().parse(email.trim()).toLocaleLowerCase("en-US");

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Profiles = {
  Doc: z.infer<typeof zProfileDoc>;
  Entity: z.infer<typeof zProfile>;
  Fields: z.infer<typeof zProfileFields>;
  Role: z.infer<typeof zProfileRole>;
};
