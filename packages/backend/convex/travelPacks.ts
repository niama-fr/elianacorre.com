import { Effect as E, Layer as L } from "effect";

import {
  createTravelPackDraft,
  paginateTravelPackDtos,
  requireTravelPackDto,
  suggestTravelPackSlug,
  updateTravelPackDraft,
} from "../business/travel-packs";
import { CurrentAdmin, currentAdminLayer } from "../runtime/current-profile";
import { mutationLayer, queryLayer } from "../runtime/database";
import { storageReaderLayer } from "../runtime/storage";
import {
  createTravelPack,
  getTravelPack,
  listTravelPacks,
  suggestTravelPackSlug as suggestTravelPackSlugDefinition,
  updateTravelPack,
} from "../runtime/travel-packs-contract";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const adminQueryLayer = (ctx: QueryCtx) => L.mergeAll(currentAdminLayer(ctx), queryLayer(ctx.db), storageReaderLayer(ctx));
const adminMutationLayer = (ctx: MutationCtx) => L.mergeAll(currentAdminLayer(ctx), mutationLayer(ctx.db), storageReaderLayer(ctx));

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const get = getTravelPack.register(query, {
  handler: E.fn(function* ({ travelPackId }) {
    yield* CurrentAdmin;
    return yield* requireTravelPackDto(travelPackId);
  }),
  layer: adminQueryLayer,
});

export const list = listTravelPacks.register(query, {
  handler: E.fn(function* ({ paginationOpts }) {
    yield* CurrentAdmin;
    return yield* paginateTravelPackDtos(paginationOpts);
  }),
  layer: adminQueryLayer,
});

export const suggestSlug = suggestTravelPackSlugDefinition.register(query, {
  handler: E.fn(function* ({ title, travelPackId }) {
    yield* CurrentAdmin;
    return yield* suggestTravelPackSlug(title, travelPackId ?? undefined);
  }),
  layer: adminQueryLayer,
});

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const create = createTravelPack.register(mutation, {
  handler: ({ title }) =>
    createTravelPackDraft(title, Date.now()).pipe(
      E.map((data) => ({ data }) as const),
      E.catchTag("TravelPackFailure", ({ code }) => E.succeed({ error: code } as const))
    ),
  layer: adminMutationLayer,
});

export const update = updateTravelPack.register(mutation, {
  handler: (args) =>
    updateTravelPackDraft(args, Date.now()).pipe(
      E.map((slug) => ({ data: { slug } }) as const),
      E.catchTag("TravelPackFailure", ({ code }) => E.succeed({ error: code } as const))
    ),
  layer: adminMutationLayer,
});
