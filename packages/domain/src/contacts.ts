import { z } from "zod/mini";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zContactFields = z.object({
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

// CRUD ------------------------------------------------------------------------------------------------------------------------------------
export const zContactCreate = zContactFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type Contacts = {
  Create: z.infer<typeof zContactCreate>;
  CreateValues: z.infer<typeof zContactCreateValues>;
  Fields: z.infer<typeof zContactFields>;
};
