import { zDocCommon } from "@ec/domain/schemas/utils";
import z from "zod";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsSuppressionFields = z.object({
  canonicalEmailHash: z.string(),
});
export const zNewsSuppressionDoc = z.object({ ...zDocCommon("newsSuppressions").shape, ...zNewsSuppressionFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsSuppressionCreate = zNewsSuppressionFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsSuppressions = {
  Create: z.infer<typeof zNewsSuppressionCreate>;
  Doc: z.infer<typeof zNewsSuppressionDoc>;
  Fields: z.infer<typeof zNewsSuppressionFields>;
};
