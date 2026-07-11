import z from "zod";

import { zDocCommon } from "./utils";

// FIELDS ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsSuppressionFields = z.object({ canonicalEmailHash: z.string() });
export const zNewsSuppressionDoc = z.object({ ...zDocCommon("newsSuppressions").shape, ...zNewsSuppressionFields.shape });

// CREATE ----------------------------------------------------------------------------------------------------------------------------------
export const zNewsSuppressionCreate = zNewsSuppressionFields;

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type NewsSuppressions = {
  Create: z.infer<typeof zNewsSuppressionCreate>;
  Doc: z.infer<typeof zNewsSuppressionDoc>;
  Fields: z.infer<typeof zNewsSuppressionFields>;
};
