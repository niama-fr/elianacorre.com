import { FunctionSpec, GroupSpec } from "@confect/core";
import { PrivacyNoticeNotFound } from "@ec/domain/errors/legal-texts";
import { sAuthError } from "@ec/domain/schemas/auth";
import { sNewsSubscriptionUpsert } from "@ec/domain/schemas/news-subscriptions";
import { Schema as S } from "effect";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
export const sNewsletterConfirmArgs = S.toStandardSchemaV1(S.Struct({ token: S.String }));

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({ format: S.Literals(["csv", "json"]) }),
      error: () => sAuthError,
      name: "exportData",
      returns: () => S.Struct({ content: S.String, contentType: S.Literals(["application/json", "text/csv"]) }),
    })
  )
  // MUTATION ------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sNewsletterConfirmArgs,
      name: "confirm",
      returns: () =>
        S.Struct({
          confirmed: S.Boolean,
          downloadToken: S.OptionFromNullOr(S.String),
        }),
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
