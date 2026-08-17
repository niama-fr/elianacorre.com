import { travelPacksValidation } from "@/features/travel-packs/validation";
import * as m from "@/paraglide/messages";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const INTERNAL_ERROR_PATTERN = /^[A-Z][A-Z0-9_]+$/u;

const validationMessages = { ...travelPacksValidation } as const;

export function validationMessage(error: string) {
  const message = validationMessages[error as keyof typeof validationMessages];
  if (message) return message();
  return INTERNAL_ERROR_PATTERN.test(error) ? m.plain_apples_rest() : error;
}
