import { Schema as S } from "effect";

export class PrivacyNoticeNotFound extends S.TaggedError<PrivacyNoticeNotFound>()("PrivacyNoticeNotFound", {}) {}
