import type { Profiles } from "@ec/domain/schemas/profiles";
import { customCtx, NoOp } from "convex-helpers/server/customFunctions";
import { zCustomAction, zCustomMutation, zCustomQuery } from "convex-helpers/server/zod4";
import { ConvexError } from "convex/values";

import { getIdentityByAdapterId } from "../data/identities";
import { getProfile } from "../data/profiles";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// ZOD -------------------------------------------------------------------------------------------------------------------------------------
export const zAction = zCustomAction(action, NoOp);
export const zMutation = zCustomMutation(mutation, NoOp);
export const zQuery = zCustomQuery(query, NoOp);
export const zInternalAction = zCustomAction(internalAction, NoOp);
export const zInternalMutation = zCustomMutation(internalMutation, NoOp);
export const zInternalQuery = zCustomQuery(internalQuery, NoOp);

// AUTHENTICATED ---------------------------------------------------------------------------------------------------------------------------
const resolveAuthenticatedProfile = async (ctx: MutationCtx | QueryCtx): Promise<Profiles["Doc"]> => {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new ConvexError("Unauthenticated");
  const identity = await getIdentityByAdapterId(ctx, user._id);
  if (!identity) throw new ConvexError("Unauthenticated");
  const profile = await getProfile(ctx, identity.profileId);
  if (!profile) throw new ConvexError("Unauthenticated");
  return profile;
};

export const authenticatedCtx = customCtx<MutationCtx | QueryCtx, { profile: Profiles["Doc"] }>(async (ctx) => ({
  profile: await resolveAuthenticatedProfile(ctx),
}));

export const zAuthenticatedMutation = zCustomMutation(mutation, authenticatedCtx);
export const zAuthenticatedQuery = zCustomQuery(query, authenticatedCtx);

// ADMIN -----------------------------------------------------------------------------------------------------------------------------------
export const adminCtx = customCtx<MutationCtx | QueryCtx, { profile: Profiles["Doc"] }>(async (ctx) => {
  const profile = await resolveAuthenticatedProfile(ctx);
  if (profile.role !== "admin") throw new ConvexError("Unauthorized");
  return { profile };
});

export const zAdminMutation = zCustomMutation(mutation, adminCtx);
export const zAdminQuery = zCustomQuery(query, adminCtx);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type AuthenticatedActionCtx = ActionCtx & { profile: Profiles["Doc"] };
export type AuthenticatedMutationCtx = MutationCtx & { profile: Profiles["Doc"] };
export type AuthenticatedQueryCtx = QueryCtx & { profile: Profiles["Doc"] };
