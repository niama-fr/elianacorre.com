import type { Profiles } from "@ec/domain/schemas/profiles";
import { customCtx, NoOp } from "convex-helpers/server/customFunctions";
import { zCustomAction, zCustomMutation, zCustomQuery } from "convex-helpers/server/zod4";
import { ConvexError } from "convex/values";
import { Effect as E, Result } from "effect";

import { CurrentAdmin, CurrentProfile, currentAdminLayer, currentProfileLayer } from "../runtime/current-profile";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";

// ZOD -------------------------------------------------------------------------------------------------------------------------------------
export const zAction = zCustomAction(action, NoOp);
export const zMutation = zCustomMutation(mutation, NoOp);
export const zQuery = zCustomQuery(query, NoOp);
export const zInternalAction = zCustomAction(internalAction, NoOp);
export const zInternalMutation = zCustomMutation(internalMutation, NoOp);
export const zInternalQuery = zCustomQuery(internalQuery, NoOp);

// AUTHENTICATED ---------------------------------------------------------------------------------------------------------------------------
const runCapability = async <A, Error extends { readonly message: string }>(effect: E.Effect<A, Error>) =>
  await E.runPromise(E.result(effect)).then(
    Result.match({
      onFailure: (error) => {
        throw new ConvexError(error.message);
      },
      onSuccess: (value) => value,
    })
  );

const resolveAuthenticatedProfile = async (ctx: MutationCtx | QueryCtx) =>
  await runCapability(CurrentProfile.pipe(E.provide(currentProfileLayer(ctx))));

export const authenticatedCtx = customCtx<MutationCtx | QueryCtx, { profile: Profiles["Doc"] }>(async (ctx) => ({
  profile: await resolveAuthenticatedProfile(ctx),
}));

export const zAuthenticatedMutation = zCustomMutation(mutation, authenticatedCtx);
export const zAuthenticatedQuery = zCustomQuery(query, authenticatedCtx);

// ADMIN -----------------------------------------------------------------------------------------------------------------------------------
export const adminCtx = customCtx<MutationCtx | QueryCtx, { profile: Profiles["Doc"] }>(async (ctx) => {
  const profile = await runCapability(CurrentAdmin.pipe(E.provide(currentAdminLayer(ctx))));
  return { profile };
});

export const zAdminMutation = zCustomMutation(mutation, adminCtx);
export const zAdminQuery = zCustomQuery(query, adminCtx);

// TYPES -----------------------------------------------------------------------------------------------------------------------------------
export type AuthenticatedActionCtx = ActionCtx & { profile: Profiles["Doc"] };
export type AuthenticatedMutationCtx = MutationCtx & { profile: Profiles["Doc"] };
export type AuthenticatedQueryCtx = QueryCtx & { profile: Profiles["Doc"] };
