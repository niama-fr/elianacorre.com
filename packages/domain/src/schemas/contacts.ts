import { zid } from "convex-helpers/server/zod4";
import { z } from "zod/mini";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zContactRequestFields = z.object({
  message: z.string(),
  profileId: zid("profiles"),
});

export const zLegacyContactFields = z.object({
  email: z.email(),
  forename: z.string(),
  message: z.string(),
  surname: z.string(),
});

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const zContactCreateValues = z.object({
  email: z.email("Ce champ doit être un courriel valide"),
  forename: z.string().check(z.minLength(1, "Ce champ est requis")),
  message: z.string().check(z.minLength(1, "Ce champ est requis")),
  surname: z.string().check(z.minLength(1, "Ce champ est requis")),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Contacts = {
  CreateValues: z.infer<typeof zContactCreateValues>;
  RequestFields: z.infer<typeof zContactRequestFields>;
};
