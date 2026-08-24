import { AuthenticationRequired, AuthorizationRequired } from "@ec/domain/errors/auth";
import type { Profiles } from "@ec/domain/schemas/profiles";
import { Context as C, Effect as E, Layer as L, Option as O } from "effect";

import type { ActionCtx, MutationCtx, QueryCtx } from "../confect/_generated/services";
import { getIdentityByAdapterId } from "../data/identities";
import { getProfile } from "../data/profiles";
import { authComponent } from "./better-auth";

// SERVICES --------------------------------------------------------------------------------------------------------------------------------
export const CurrentProfile = C.Service<Profiles["Doc"]>("elianacorre/CurrentProfile");
export const CurrentAdmin = C.Service<Profiles["Doc"]>("elianacorre/CurrentAdmin");

// RESOLVE ---------------------------------------------------------------------------------------------------------------------------------
const resolveCurrentProfile = E.fn("resolveCurrentProfile")(function* (ctx: ActionCtx | MutationCtx | QueryCtx) {
  const user = yield* E.promise(async () => await authComponent.safeGetAuthUser(ctx));
  if (!user) return yield* new AuthenticationRequired({ message: "Unauthenticated" });
  const identity = yield* getIdentityByAdapterId(user._id);
  if (O.isNone(identity)) return yield* new AuthenticationRequired({ message: "Unauthenticated" });
  const profile = yield* getProfile(identity.value.profileId);
  if (O.isNone(profile)) return yield* new AuthenticationRequired({ message: "Unauthenticated" });
  return profile.value;
});

const resolveCurrentAdmin = E.fn("resolveCurrentAdmin")(function* (ctx: ActionCtx | MutationCtx | QueryCtx) {
  const profile = yield* resolveCurrentProfile(ctx);
  if (profile.role !== "admin") return yield* new AuthorizationRequired({ message: "Unauthorized" });
  return profile;
});

// LAYERS ----------------------------------------------------------------------------------------------------------------------------------
export const currentProfileLayer = (ctx: ActionCtx | MutationCtx | QueryCtx) => L.effect(CurrentProfile, resolveCurrentProfile(ctx));
export const currentAdminLayer = (ctx: ActionCtx | MutationCtx | QueryCtx) => L.effect(CurrentAdmin, resolveCurrentAdmin(ctx));
