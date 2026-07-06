import type { Profiles } from "@ec/domain/schemas/profiles";
import { customCtx, NoOp } from "convex-helpers/server/customFunctions";
import { zCustomAction, zCustomMutation, zCustomQuery } from "convex-helpers/server/zod4";
import { ConvexError } from "convex/values";

import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const AUTH_ADAPTER = "better-auth";

// ZOD -------------------------------------------------------------------------------------------------------------------------------------
export const zAction = zCustomAction(action, NoOp);
export const zMutation = zCustomMutation(mutation, NoOp);
export const zQuery = zCustomQuery(query, NoOp);
export const zInternalAction = zCustomAction(internalAction, NoOp);
export const zInternalMutation = zCustomMutation(internalMutation, NoOp);
export const zInternalQuery = zCustomQuery(internalQuery, NoOp);

// ADMIN -----------------------------------------------------------------------------------------------------------------------------------
export const adminCtx = customCtx<MutationCtx | QueryCtx, { profile: Profiles["Doc"] }>(async (ctx) => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError("Unauthenticated");
  if (!user.emailVerified) throw new ConvexError("Unauthenticated");
  const identity = await ctx.db
    .query("identities")
    .withIndex("by_adapter_and_adapter_id", (indexQuery) => indexQuery.eq("adapter", AUTH_ADAPTER).eq("adapterId", user._id))
    .unique();
  if (identity === null) throw new ConvexError("Unauthenticated");
  const profile = await ctx.db.get("profiles", identity.profileId);
  if (profile === null) throw new ConvexError("Unauthenticated");
  if (profile.role !== "admin") throw new ConvexError("Unauthorized");
  return { profile };
});

export const zAdminMutation = zCustomMutation(mutation, adminCtx);
export const zAdminQuery = zCustomQuery(query, adminCtx);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type AdminActionCtx = ActionCtx & { profile: Profiles["Doc"] };
export type AdminMutationCtx = MutationCtx & { profile: Profiles["Doc"] };
export type AdminQueryCtx = QueryCtx & { profile: Profiles["Doc"] };
