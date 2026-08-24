import { FunctionImpl, GroupImpl } from "@confect/server";
import { Effect as E, Layer as L } from "effect";

import {
  createTravelPackDraft,
  paginateTravelPackDtos,
  requireTravelPackDto,
  suggestTravelPackSlug,
  updateTravelPackDraft,
} from "../features/travel-packs";
import { currentAdminLayer } from "../infra/current-profile";
import databaseSchema from "./_generated/schema";
import { MutationCtx, QueryCtx } from "./_generated/services";
import spec from "./travelPacks.spec";

// QUERIES -------------------------------------------------------------------------------------------------------------------------------
const get = FunctionImpl.make(databaseSchema, spec, "get", ({ travelPackId }) =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;
    return yield* requireTravelPackDto(travelPackId).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const list = FunctionImpl.make(databaseSchema, spec, "list", ({ paginationOpts }) =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;
    return yield* paginateTravelPackDtos(paginationOpts).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

const suggestSlug = FunctionImpl.make(databaseSchema, spec, "suggestSlug", ({ title, travelPackId }) =>
  E.gen(function* () {
    const ctx = yield* QueryCtx;
    return yield* suggestTravelPackSlug(title, travelPackId ?? undefined).pipe(E.provide(currentAdminLayer(ctx)));
  })
);

// MUTATIONS -----------------------------------------------------------------------------------------------------------------------------
const create = FunctionImpl.make(databaseSchema, spec, "create", ({ title }) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;

    return yield* createTravelPackDraft(title, Date.now()).pipe(
      E.map((data) => ({ data }) as const),
      E.catchTags({
        ValidationFailure: ({ code }) => E.succeed({ error: code } as const),
      }),
      E.provide(currentAdminLayer(ctx))
    );
  })
);

const update = FunctionImpl.make(databaseSchema, spec, "update", (args) =>
  E.gen(function* () {
    const ctx = yield* MutationCtx;

    return yield* updateTravelPackDraft(args, Date.now()).pipe(
      E.map((slug) => ({ data: { slug } }) as const),
      E.catchTags({
        TravelPackFailure: ({ code }) => E.succeed({ error: code } as const),
        ValidationFailure: ({ code }) => E.succeed({ error: code } as const),
      }),
      E.provide(currentAdminLayer(ctx))
    );
  })
);

// IMPL ------------------------------------------------------------------------------------------------------------------------------------
export default GroupImpl.make(databaseSchema, spec).pipe(
  L.provide(get),
  L.provide(list),
  L.provide(suggestSlug),
  L.provide(create),
  L.provide(update),
  GroupImpl.finalize
);
