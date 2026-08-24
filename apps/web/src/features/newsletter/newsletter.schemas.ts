import { GenericId } from "@confect/core";
import { NEWS_SUBSCRIPTION_ISSUE } from "@ec/domain/schemas/news-subscriptions";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

// CONFIRM ---------------------------------------------------------------------------------------------------------------------------------
export const sNewsletterConfirm = S.Struct({ token: S.String });

// SUBSCRIBE FORM --------------------------------------------------------------------------------------------------------------------------
export const sNewsletterSubscribeForm = S.Struct({
  consent: S.Boolean.check(S.makeFilter((value) => value, { message: NEWS_SUBSCRIPTION_ISSUE.consentRequired })),
  email: sCanonicalEmail,
  firstName: S.Trim,
  privacyNoticeId: GenericId.GenericId("legalTexts"),
  website: S.Trim,
});
export type NewsletterSubscribeFormValues = typeof sNewsletterSubscribeForm.Type;
