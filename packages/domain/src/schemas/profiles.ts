import { z } from "zod";

import { zCanonicalEmail, zDocCommon } from "./utils";

// ROLE ------------------------------------------------------------------------------------------------------------------------------------
export const zProfileRole = z.literal(["admin", "contact", "member"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zProfileFields = z.object({
  email: zCanonicalEmail,
  firstName: z.optional(z.string()),
  role: zProfileRole,
});
export const zProfileDoc = z.object({ ...zDocCommon("profiles").shape, ...zProfileFields.shape });

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zProfile = zProfileDoc;

// SEED ------------------------------------------------------------------------------------------------------------------------------------
export const zProfileAdminsSeed = z
  .string()
  .trim()
  .transform((input, { issues }): unknown => {
    try {
      return JSON.parse(input);
    } catch {
      issues.push({ code: "custom", input, message: "Invalid JSON" });
      return z.NEVER;
    }
  })
  .pipe(zCanonicalEmail.array().min(1));

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Profiles = {
  Doc: z.infer<typeof zProfileDoc>;
  Entity: z.infer<typeof zProfile>;
  Fields: z.infer<typeof zProfileFields>;
  Role: z.infer<typeof zProfileRole>;
};
