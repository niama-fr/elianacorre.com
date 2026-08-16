import { isConvexErrorCode } from "@ec/domain/helpers/errors";
import { zTravelPackCreate, zTravelPackTitle, zTravelPackUpdate } from "@ec/domain/schemas/travel-packs";
import { zid } from "convex-helpers/server/zod4";

import {
  createTravelPackDraft,
  requireTravelPackDto,
  suggestTravelPackSlug,
  takeTravelPackDtos,
  updateTravelPackDraft,
} from "../business/travel-packs";
import { zAdminMutation, zAdminQuery } from "./zod";

const TRAVEL_PACK_INPUT_ERRORS = [
  "INVALID_TRAVEL_PACK_COVER",
  "INVALID_TRAVEL_PACK_PDF",
  "INVALID_TRAVEL_PACK_SLUG",
  "TRAVEL_PACK_SLUG_TAKEN",
] as const;

type TravelPackInputError = (typeof TRAVEL_PACK_INPUT_ERRORS)[number];

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const list = zAdminQuery({
  args: {},
  handler: async (ctx) => await takeTravelPackDtos(ctx, 100),
});

export const get = zAdminQuery({
  args: { travelPackId: zid("travelPacks") },
  handler: async (ctx, { travelPackId }) => await requireTravelPackDto(ctx, travelPackId),
});

export const suggestSlug = zAdminQuery({
  args: {
    title: zTravelPackTitle,
    travelPackId: zid("travelPacks").nullable(),
  },
  handler: async (ctx, { title, travelPackId }) => await suggestTravelPackSlug(ctx, title, travelPackId ?? undefined),
});

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const create = zAdminMutation({
  args: zTravelPackCreate,
  handler: async (ctx, args) => {
    try {
      return {
        data: await createTravelPackDraft(ctx, { ...args, now: Date.now() }),
      };
    } catch (error) {
      if (!isTravelPackInputError(error)) throw error;
      return { error: error.data };
    }
  },
});

export const generateUploadUrl = zAdminMutation({
  args: {},
  handler: async (ctx) => await ctx.storage.generateUploadUrl(),
});

export const update = zAdminMutation({
  args: {
    patch: zTravelPackUpdate,
    travelPackId: zid("travelPacks"),
  },
  handler: async (ctx, { patch, travelPackId }) => {
    try {
      await updateTravelPackDraft(ctx, travelPackId, { ...patch, now: Date.now() });
      return {};
    } catch (error) {
      if (!isTravelPackInputError(error)) throw error;
      return { error: error.data };
    }
  },
});

// INTERNAL -------------------------------------------------------------------------------------------------------------------------------
function isTravelPackInputError(error: unknown): error is { data: TravelPackInputError } {
  return TRAVEL_PACK_INPUT_ERRORS.some((code) => isConvexErrorCode(error, code));
}
