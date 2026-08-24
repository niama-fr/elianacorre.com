import { Schema as S, SchemaTransformation as ST } from "effect";

// ISSUES ----------------------------------------------------------------------------------------------------------------------------------
export const VALIDATION_ISSUE = {
  emailInvalid: "EMAIL_INVALID",
  required: "REQUIRED",
  slugInvalid: "SLUG_INVALID",
} as const;
export const sValidationIssue = S.Literals(Object.values(VALIDATION_ISSUE));

// STRINGS ---------------------------------------------------------------------------------------------------------------------------------
export const sTrimOptional = S.Trim.pipe(
  S.decodeTo(S.UndefinedOr(S.Trimmed), ST.transform({ decode: (s) => (s === "" ? undefined : s), encode: (s) => s ?? "" }))
);

export const sTrimRequired = S.Trim.check(S.isMinLength(1, { message: VALIDATION_ISSUE.required }));

export const sSlug = sTrimRequired.check(S.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, { message: VALIDATION_ISSUE.slugInvalid }));

export const sUrlString = S.String.check(S.makeFilter((value) => URL.canParse(value)));

// NUMBERS ---------------------------------------------------------------------------------------------------------------------------------
export const sStrictNatural = S.Natural.check(S.isGreaterThan(0));

// EMAILS ----------------------------------------------------------------------------------------------------------------------------------
const EMAIL_PATTERN = /^(?!\.)(?!.*\.\.)(?<local>[A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@(?<domain>[A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/u;

export const sCanonicalEmail = S.Trim.pipe(S.decode(ST.toLowerCase())).check(
  S.isPattern(EMAIL_PATTERN, { message: VALIDATION_ISSUE.emailInvalid })
);

export const sConfirmedEmailPayload = S.Struct({
  confirmed: S.Literal(true),
  email: sCanonicalEmail,
});

// PAGINATION ------------------------------------------------------------------------------------------------------------------------------
export const sPaginationOptions = S.Struct({
  cursor: S.NullOr(S.String),
  endCursor: S.optionalKey(S.NullOr(S.String)),
  id: S.optionalKey(S.Natural),
  maximumBytesRead: S.optionalKey(S.Natural),
  maximumRowsRead: S.optionalKey(S.Natural),
  numItems: S.Natural,
});

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type WithNow<T = object> = { now: number } & T;
