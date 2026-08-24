import { FunctionSpec, GroupSpec } from "@confect/core";
import { PrivacyNoticeNotFound } from "@ec/domain/errors/legal-texts";
import { Schema as S } from "effect";

import legalTexts from "./_generated/tables/legalTexts";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({}),
      error: () => PrivacyNoticeNotFound,
      name: "requireActivePrivacyNotice",
      returns: () => legalTexts.Doc,
    })
  );
