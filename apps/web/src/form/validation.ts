import { VALIDATION_ISSUE } from "@ec/domain/schemas/utils";

import { NEWSLETTER_VALIDATION_MESSAGES } from "@/features/newsletter/newsletter.validation";

const validationMessages = {
  ...NEWSLETTER_VALIDATION_MESSAGES,
  [VALIDATION_ISSUE.emailInvalid]: "Ce courriel est invalide",
  [VALIDATION_ISSUE.required]: "Ce champ est requis",
} as const;

export function validationMessage(error: string) {
  return validationMessages[error as keyof typeof validationMessages] ?? error;
}
