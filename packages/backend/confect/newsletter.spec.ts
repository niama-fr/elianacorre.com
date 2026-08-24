import { FunctionSpec, GroupSpec } from "@confect/core";
import { PrivacyNoticeNotFound } from "@ec/domain/errors/legal-texts";
import { sAuthError } from "@ec/domain/schemas/auth";
import { sNewsSubscriptionUpsert } from "@ec/domain/schemas/news-subscriptions";
import { Schema as S } from "effect";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const sConfirmArgs = S.Struct({ token: S.String });
const sConfirmReturns = S.Struct({ confirmed: S.Boolean, downloadToken: S.OptionFromNullOr(S.String) });
const sExportDataArgs = S.Struct({ exportedAt: S.Int, format: S.Literals(["csv", "json"]) });
const sExportDataReturns = S.Struct({ content: S.String, contentType: S.Literals(["application/json", "text/csv"]) });

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
      args: () => sNewsSubscriptionUpsert,
      error: () => PrivacyNoticeNotFound,
      name: "subscribe",
      returns: () => S.Null,
    })
  );
