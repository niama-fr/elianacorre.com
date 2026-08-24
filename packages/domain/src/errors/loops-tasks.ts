import { Schema as S } from "effect";

export class LoopsTaskNotFound extends S.TaggedError<LoopsTaskNotFound>()("LoopsTaskNotFound", {}) {}

export class LoopsTaskNotFailed extends S.TaggedError<LoopsTaskNotFailed>()("LoopsTaskNotFailed", {}) {}
