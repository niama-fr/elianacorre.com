import { zDocCommon } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";
import z from "zod";

// KIND ------------------------------------------------------------------------------------------------------------------------------------
const kinds = ["newsletterConsent", "privacyNotice"] as const;
export const zLegalTextKind = z.literal(kinds);

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zMarkdownContent = z
  .string()
  .trim()
  .min(1)
  .describe("Nonblank CommonMark Markdown; raw HTML is not part of the supported rendering contract");

export const zLegalTextFields = z.object({
  content: zMarkdownContent,
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
  content: zMarkdownContent,
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
