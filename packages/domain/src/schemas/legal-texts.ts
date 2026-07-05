import { zid } from "convex-helpers/server/zod4";
import z from "zod";

import { zDocCommon } from "./utils";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
export const zLegalTextKind = z.literal(["newsletter-consent", "privacy-notice"]);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zLegalTextFields = z.object({
  content: z.string().min(1),
  kind: zLegalTextKind,
  publishedAt: z.number().nullable(),
  publishedBy: zid("profiles").nullable(),
});
export const zLegalTextDoc = z.object({ ...zDocCommon("legalTexts").shape, ...zLegalTextFields.shape });

export const zLegalTextEntry = zLegalTextDoc;

// ENTITY ----------------------------------------------------------------------------------------------------------------------------------
export const zLegalText = zLegalTextEntry;

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zLegalTextCreate = z.object({
  content: z.string().min(1),
  kind: zLegalTextKind,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type LegalTexts = {
  Create: z.infer<typeof zLegalTextCreate>;
  Doc: z.infer<typeof zLegalTextDoc>;
  Entity: z.infer<typeof zLegalText>;
  Entry: z.infer<typeof zLegalTextEntry>;
  Fields: z.infer<typeof zLegalTextFields>;
};
