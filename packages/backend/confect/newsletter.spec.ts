import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { PrivacyNoticeNotFound } from "@ec/domain/errors/legal-texts";
import { sAuthError } from "@ec/domain/schemas/auth";
import { NEWS_SUBSCRIPTION_ISSUE } from "@ec/domain/schemas/news-subscriptions";
import { sCanonicalEmail, sTrimOptional } from "@ec/domain/schemas/utils";
import { Effect as E, Schema as S } from "effect";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const sConfirmArgs = S.Struct({ token: S.String });
const sConfirmReturns = S.Struct({ confirmed: S.Boolean, downloadToken: S.OptionFromNullOr(S.String) });
const sExportDataArgs = S.Struct({ format: S.Literals(["csv", "json"]) });
const sExportDataReturns = S.Struct({ content: S.String, contentType: S.Literals(["application/json", "text/csv"]) });
const sSubscribeArgs = S.Struct({
  consent: S.Boolean.check(S.makeFilter((value): value is true => value, { message: NEWS_SUBSCRIPTION_ISSUE.consentRequired })),
  email: sCanonicalEmail,
  firstName: sTrimOptional,
  privacyNoticeId: GenericId.GenericId("legalTexts"),
  website: S.Trim.pipe(S.withDecodingDefault(E.succeed(""))),
});

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => sExportDataArgs,
      error: () => sAuthError,
      name: "exportData",
      returns: () => sExportDataReturns,
    })
  )
  // MUTATION ------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sConfirmArgs,
      name: "confirm",
      returns: () => sConfirmReturns,
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sSubscribeArgs,
      error: () => PrivacyNoticeNotFound,
      name: "subscribe",
      returns: () => S.Null,
    })
  );
