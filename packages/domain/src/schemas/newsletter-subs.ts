import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zCanonicalEmail, zCanonicalEmailValue, zDocCommon } from "./utils";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterSubFields = z.object({
  confirmTokenHash: z.string().nullable(),
  confirmedAt: z.number().nullable(),
  legalBundleId: zid("newsletterLegalBundles"),
  profileId: zid("profiles"),
  requestedAt: z.number(),
  unsubscribedAt: z.number().nullable(),
});
export const zNewsletterSubDoc = z.object({ ...zDocCommon("newsletterSubs").shape, ...zNewsletterSubFields.shape });

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterSub = zNewsletterSubDoc;

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterSubCreateValues = z.object({
  consent: z.boolean().refine((v) => v, "Vous devez accepter de recevoir la lettre"),
  email: zCanonicalEmailValue,
  firstName: z.string().trim(),
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterSubCreate = z.object({
  consent: z.boolean().refine((v) => v),
  email: zCanonicalEmail,
  firstName: z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v)),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsletterSubs = {
  Create: z.infer<typeof zNewsletterSubCreate>;
  CreateValues: z.infer<typeof zNewsletterSubCreateValues>;
  Doc: z.infer<typeof zNewsletterSubDoc>;
  Entity: z.infer<typeof zNewsletterSub>;
  Fields: z.infer<typeof zNewsletterSubFields>;
};
