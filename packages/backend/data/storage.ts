import type { MutationCtx, QueryCtx } from "@ec/backend/server";
import type { Id } from "@ec/backend/types";
import type { PaginationOptions } from "convex/server";

// GET -------------------------------------------------------------------------------------------------------------------------------------
export const getStorageDoc = async (ctx: QueryCtx, id: Id<"_storage">) => await ctx.db.system.get("_storage", id);

export const getStorageUrl = async (ctx: QueryCtx, id: Id<"_storage">) => await ctx.storage.getUrl(id);

// LIST ------------------------------------------------------------------------------------------------------------------------------------
export const paginateStorageBefore = async (ctx: QueryCtx, pagination: PaginationOptions, before: number) =>
  await ctx.db.system
    .query("_storage")
    .withIndex("by_creation_time", (q) => q.lt("_creationTime", before))
    .order("asc")
    .paginate(pagination);

// DELETE ----------------------------------------------------------------------------------------------------------------------------------
export const deleteStorage = async (ctx: MutationCtx, id: Id<"_storage">) => {
  await ctx.storage.delete(id);
};
