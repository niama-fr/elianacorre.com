import { zCanonicalEmail, zCanonicalEmailValue, zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// CONFIRMED FROM --------------------------------------------------------------------------------------------------------------------------
const confirmedFrom = ["email", "loops"] as const;
export const zNewsSubscriptionConfirmedFrom = z.literal(confirmedFrom);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsSubscriptionFields = z.object({
  confirmedAt: z.number().nullable(),
  confirmedFrom: zNewsSubscriptionConfirmedFrom.nullable(),
  legalBundleId: zid("newsletterLegalBundles").optional(),
  privacyNoticeId: zid("legalTexts").optional(),
  profileId: zid("profiles"),
  requestedAt: z.number(),
  unsubscribedAt: z.number().nullable(),
});
export const zNewsSubscriptionDoc = z.object({ ...zDocCommon("newsSubscriptions").shape, ...zNewsSubscriptionFields.shape });

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsSubscriptionUpsertValues = z.object({
  consent: z.boolean().refine((value) => value, "Vous devez accepter de recevoir la lettre"),
  email: zCanonicalEmailValue,
  firstName: z.string().trim(),
  privacyNoticeId: zid("legalTexts"),
  website: z.string().trim(),
});

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsSubscriptionCreate = zNewsSubscriptionFields
  .pick({ privacyNoticeId: true, profileId: true, requestedAt: true })
  .required({ privacyNoticeId: true });

export const zNewsSubscriptionUpsert = z
  .object({
    consent: z.boolean().refine((value) => value),
    email: zCanonicalEmail,
    firstName: z
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value)),
    legalBundleId: zid("newsletterLegalBundles").optional(),
    privacyNoticeId: zid("legalTexts").optional(),
    requestIp: z.string().trim().min(1),
    website: z.string().trim().default(""),
  })
  .refine(({ legalBundleId, privacyNoticeId }) => legalBundleId !== undefined || privacyNoticeId !== undefined, {
    message: "A privacy notice or legacy legal bundle is required",
  });

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsSubscriptions = {
  ConfirmedFrom: z.infer<typeof zNewsSubscriptionConfirmedFrom>;
  Create: z.infer<typeof zNewsSubscriptionCreate>;
  Doc: z.infer<typeof zNewsSubscriptionDoc>;
  Fields: z.infer<typeof zNewsSubscriptionFields>;
  Upsert: z.infer<typeof zNewsSubscriptionUpsert>;
  UpsertValues: z.infer<typeof zNewsSubscriptionUpsertValues>;
};
