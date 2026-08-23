import { Schema as S } from "effect";

export class EbookNotFound extends S.TaggedError<EbookNotFound>()("EbookNotFound", {}) {}
