import { VALIDATION_ISSUE } from "@ec/domain/schemas/utils";

import { ebooksValidation } from "@/features/ebooks/ebooks.validation";
import { travelPacksValidation } from "@/features/travel-packs/travel-packs.validation";
import * as m from "@/paraglide/messages";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const INTERNAL_ERROR_PATTERN = /^[A-Z][A-Z0-9_]+$/u;

const validationMessages = {
  ...ebooksValidation,
  ...travelPacksValidation,
  [VALIDATION_ISSUE.required]: m.calm_fields_wait,
  [VALIDATION_ISSUE.slugInvalid]: m.neat_paths_work,
} as const;

export function validationMessage(error: string) {
  const message = validationMessages[error as keyof typeof validationMessages];
  if (message) return message();
  return INTERNAL_ERROR_PATTERN.test(error) ? m.plain_apples_rest() : error;
}
