import z from "zod";

import { zCanonicalEmail, zDocCommon } from "./utils";

// ENUMS -----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterBlockReason = z.literal(["bounced", "complained", "suppressed"]);
export const zNewsletterBlockSource = z.literal(["manual-admin", "privacy-request", "provider-webhook"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterBlockFields = z.object({
  confirmRequestedAt: z.number().optional(),
  confirmTokenHash: z.string().optional(),
  createdAt: z.number(),
  email: zCanonicalEmail,
  reason: zNewsletterBlockReason,
  source: zNewsletterBlockSource,
  updatedAt: z.number(),
});
export const zNewsletterBlockDoc = z.object({
  ...zDocCommon("newsletterBlocks").shape,
  ...zNewsletterBlockFields.shape,
});

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsletterBlock = zNewsletterBlockDoc;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsletterBlocks = {
  Doc: z.infer<typeof zNewsletterBlockDoc>;
  Entity: z.infer<typeof zNewsletterBlock>;
  Fields: z.infer<typeof zNewsletterBlockFields>;
  Reason: z.infer<typeof zNewsletterBlockReason>;
  Source: z.infer<typeof zNewsletterBlockSource>;
};
