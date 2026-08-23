import { Schema as S } from "effect";

import { AuthenticationRequired, AuthorizationRequired } from "../errors/auth";

// ADAPTERS --------------------------------------------------------------------------------------------------------------------------------
export const sAuthAdapter = S.Literal("better-auth");

// ERRORS ----------------------------------------------------------------------------------------------------------------------------------
export const sAuthError = S.Union([AuthenticationRequired, AuthorizationRequired]);
