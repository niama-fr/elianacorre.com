import { FunctionSpec, GenericId } from "@confect/core";
import {
  sTravelPackCreate,
  sTravelPackDto,
  sTravelPackError,
  sTravelPackFailure,
  sTravelPackTitle,
  sTravelPackUpdate,
} from "@ec/domain/schemas/travel-packs";
import { sPaginationOptions } from "@ec/domain/schemas/utils";
import { functionModule } from "@niama/effex";
import { Schema as S } from "effect";

import { sAuthenticationRequired, sAuthorizationRequired } from "./current-profile";

const travelPacks = functionModule("travelPacks");
const sAdminError = S.Union([sAuthenticationRequired, sAuthorizationRequired, sTravelPackFailure]);
const sTravelPackId = GenericId.GenericId("travelPacks");
const sTravelPackResult = <A extends S.Top>(data: A) => S.Union([S.Struct({ data }), S.Struct({ error: sTravelPackError })]);

export const getTravelPack = travelPacks.query(
  FunctionSpec.publicQuery({
    args: () => S.Struct({ travelPackId: sTravelPackId }),
    error: () => sAdminError,
    name: "get",
    returns: () => sTravelPackDto,
  })
);

export const listTravelPacks = travelPacks.query(
  FunctionSpec.publicQuery({
    args: () => S.Struct({ paginationOpts: sPaginationOptions }),
    error: () => sAdminError,
    name: "list",
    returns: () =>
      S.Struct({
        continueCursor: S.String,
        isDone: S.Boolean,
        page: S.mutable(S.Array(sTravelPackDto)),
        pageStatus: S.optionalKey(S.NullOr(S.Literals(["SplitRecommended", "SplitRequired"]))),
        splitCursor: S.optionalKey(S.NullOr(S.String)),
      }),
  })
);

export const suggestTravelPackSlug = travelPacks.query(
  FunctionSpec.publicQuery({
    args: () => S.Struct({ title: sTravelPackTitle, travelPackId: S.NullOr(sTravelPackId) }),
    error: () => sAdminError,
    name: "suggestSlug",
    returns: () => S.String,
  })
);

export const createTravelPack = travelPacks.mutation(
  FunctionSpec.publicMutation({
    args: () => sTravelPackCreate,
    error: () => S.Union([sAuthenticationRequired, sAuthorizationRequired]),
    name: "create",
    returns: () => sTravelPackResult(sTravelPackId),
  })
);

export const updateTravelPack = travelPacks.mutation(
  FunctionSpec.publicMutation({
    args: () => sTravelPackUpdate,
    error: () => S.Union([sAuthenticationRequired, sAuthorizationRequired]),
    name: "update",
    returns: () => sTravelPackResult(S.Struct({ slug: S.String })),
  })
);
