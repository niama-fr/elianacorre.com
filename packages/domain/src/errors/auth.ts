import { Schema as S } from "effect";

// ERRORS ----------------------------------------------------------------------------------------------------------------------------------
export class AuthenticationRequired extends S.TaggedError<AuthenticationRequired>()("AuthenticationRequired", {
  message: S.Literal("Unauthenticated"),
}) {}

export class AuthorizationRequired extends S.TaggedError<AuthorizationRequired>()("AuthorizationRequired", {
  message: S.Literal("Unauthorized"),
}) {}
