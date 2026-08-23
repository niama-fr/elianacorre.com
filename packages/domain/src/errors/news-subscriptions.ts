import { Schema as S } from "effect";

export class NewsSubscriptionValidationFailure extends S.TaggedError<NewsSubscriptionValidationFailure>()(
  "NewsSubscriptionValidationFailure",
  { cause: S.Unknown }
) {}
