import { FunctionSpec, GroupSpec } from "@confect/core";
import { TravelPackNotFound } from "@ec/domain/errors/travel-packs";
import { ValidationFailure } from "@ec/domain/errors/utils";
import { sAuthError } from "@ec/domain/schemas/auth";
import { sTravelPackCreate, sTravelPackDto, sTravelPackIssue, sTravelPackUpdate } from "@ec/domain/schemas/travel-packs";
import { sPaginationOptions, sTrimRequired, sValidationIssue } from "@ec/domain/schemas/utils";
import { Schema as S } from "effect";

import { Id } from "./_generated/id";

// SPEC ------------------------------------------------------------------------------------------------------------------------------------
export default GroupSpec.make()
  // QUERIES -------------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({ travelPackId: Id("travelPacks") }),
      error: () => S.Union([sAuthError, TravelPackNotFound]),
      name: "get",
      returns: () => sTravelPackDto,
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({ paginationOpts: sPaginationOptions }),
      error: () => sAuthError,
      name: "list",
      returns: () =>
        S.Struct({
          continueCursor: S.String,
          isDone: S.Boolean,
          page: S.Array(sTravelPackDto),
          pageStatus: S.optional(S.NullOr(S.Literals(["SplitRecommended", "SplitRequired"]))),
          splitCursor: S.optional(S.NullOr(S.String)),
        }),
    })
  )
  .addFunction(
    FunctionSpec.publicQuery({
      args: () => S.Struct({ title: sTrimRequired, travelPackId: S.NullOr(Id("travelPacks")) }),
      error: () => S.Union([sAuthError, ValidationFailure]),
      name: "suggestSlug",
      returns: () => S.String,
    })
  )
  // MUTATIONS -----------------------------------------------------------------------------------------------------------------------------
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sTravelPackCreate,
      error: () => sAuthError,
      name: "create",
      returns: () => S.Union([S.Struct({ data: Id("travelPacks") }), S.Struct({ error: S.Union([sTravelPackIssue, sValidationIssue]) })]),
    })
  )
  .addFunction(
    FunctionSpec.publicMutation({
      args: () => sTravelPackUpdate,
      error: () => S.Union([sAuthError, TravelPackNotFound]),
      name: "update",
      returns: () =>
        S.Union([S.Struct({ data: S.Struct({ slug: S.String }) }), S.Struct({ error: S.Union([sTravelPackIssue, sValidationIssue]) })]),
    })
  );
