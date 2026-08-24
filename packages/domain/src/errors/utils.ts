import { Schema as S } from "effect";

import { sValidationIssue } from "../schemas/utils";

export class ValidationFailure extends S.TaggedError<ValidationFailure>()("ValidationFailure", {
  code: sValidationIssue,
}) {}
