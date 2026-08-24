import { NEWS_SUBSCRIPTION_ISSUE } from "@ec/domain/schemas/news-subscriptions";

export const NEWSLETTER_VALIDATION_MESSAGES = {
  [NEWS_SUBSCRIPTION_ISSUE.consentRequired]: "Vous devez accepter de recevoir la lettre",
} as const;
