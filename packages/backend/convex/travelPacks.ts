import { convexErrorDataFrom } from "@ec/domain/helpers/errors";
import {
  TRAVEL_PACK_ERROR,
  zTravelPackCreate,
  zTravelPackError,
  zTravelPackTitle,
  zTravelPackUpdate,
} from "@ec/domain/schemas/travel-packs";
import { zPaginationOptions } from "@ec/domain/schemas/utils";
import { zid } from "convex-helpers/server/zod4";

import {
  createTravelPackDraft,
  paginateTravelPackDtos,
  requireTravelPackDto,
  suggestTravelPackSlug,
  updateTravelPackDraft,
} from "../business/travel-packs";
import { zAdminMutation, zAdminQuery } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const get = zAdminQuery({
  args: { travelPackId: zid("travelPacks") },
  handler: async (ctx, { travelPackId }) => await requireTravelPackDto(ctx, travelPackId),
});

export const list = zAdminQuery({
  args: { paginationOpts: zPaginationOptions },
  handler: async (ctx, { paginationOpts }) => await paginateTravelPackDtos(ctx, paginationOpts),
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
      return { data: await createTravelPackDraft(ctx, { ...args, now: Date.now() }) };
    } catch (error) {
      const code = convexErrorDataFrom(error, zTravelPackError);
      if (!code) throw error;
      return { error: code };
    }
  },
});

export const update = zAdminMutation({
  args: zTravelPackUpdate.superRefine((value, ctx) => {
    if ((value.coverFileName === null) !== (value.coverStorageId === null))
      ctx.addIssue({ code: "custom", message: TRAVEL_PACK_ERROR.coverInvalid, path: ["coverStorageId"] });
    if ((value.pdfFileName === null) !== (value.pdfStorageId === null))
      ctx.addIssue({ code: "custom", message: TRAVEL_PACK_ERROR.pdfInvalid, path: ["pdfStorageId"] });
  }),
  handler: async (ctx, args) => {
    try {
      const slug = await updateTravelPackDraft(ctx, { ...args, now: Date.now() });
      return { data: { slug } };
    } catch (error) {
      const code = convexErrorDataFrom(error, zTravelPackError);
      if (!code) throw error;
      return { error: code };
    }
  },
});
