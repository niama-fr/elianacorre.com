import { Schema as S } from "effect";

// ERRORS ----------------------------------------------------------------------------------------------------------------------------------
export class HoneypotTriggered extends S.TaggedError<HoneypotTriggered>()("HoneypotTriggered", {}) {}
