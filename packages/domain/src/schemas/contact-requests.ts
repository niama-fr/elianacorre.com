import { zCanonicalEmailValue } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import { z } from "zod";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zContactRequestFields = z.object({
  message: z.string(),
  profileId: zid("profiles"),
});

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const zContactRequestCreateValues = z.object({
  email: zCanonicalEmailValue,
  firstName: z.string().trim().min(1, "Ce champ est requis"),
  message: z.string().trim().min(1, "Ce champ est requis"),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type ContactRequests = {
  CreateValues: z.infer<typeof zContactRequestCreateValues>;
  RequestFields: z.infer<typeof zContactRequestFields>;
};
