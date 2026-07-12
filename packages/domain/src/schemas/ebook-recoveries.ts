import { zCanonicalEmail, zCanonicalEmailValue } from "@ec/domain/schemas/utils";
import z from "zod";

// VALUES ----------------------------------------------------------------------------------------------------------------------------------
export const zEbookRecoveryRequestValues = z.object({
  email: zCanonicalEmailValue,
  website: z.string().trim(),
});

// REQUEST ---------------------------------------------------------------------------------------------------------------------------------
export const zEbookRecoveryRequest = z.object({
  email: zCanonicalEmail,
  requestIp: z.string().trim().min(1),
  website: z.string().trim().default(""),
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type EbookRecoveries = {
  Request: z.infer<typeof zEbookRecoveryRequest>;
  RequestValues: z.infer<typeof zEbookRecoveryRequestValues>;
};
