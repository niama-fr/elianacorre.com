/* oxlint-disable eslint/require-await, typescript/return-await, typescript/no-unsafe-argument, typescript/no-unsafe-call, typescript/no-unsafe-return, unicorn/throw-new-error -- Better Auth and Effect's yieldable tagged-error classes cross generic library seams here. */
import type { Profiles } from "@ec/domain/schemas/profiles";
import { Context, Effect as E, Layer as L, Option, Schema as S } from "effect";

import type { MutationCtx, QueryCtx } from "../convex/_generated/server";
import { authComponent } from "../convex/auth";
import { findIdentityByAdapterId } from "../data/identities";
import { findProfile } from "../data/profiles";
import { queryLayer } from "./database";

export const sAuthenticationRequired = S.TaggedError<{
  readonly _tag: "AuthenticationRequired";
  readonly message: "Unauthenticated";
}>()("AuthenticationRequired", { message: S.Literal("Unauthenticated") });
export type AuthenticationRequired = typeof sAuthenticationRequired.Type;

export const sAuthorizationRequired = S.TaggedError<{
  readonly _tag: "AuthorizationRequired";
  readonly message: "Unauthorized";
}>()("AuthorizationRequired", { message: S.Literal("Unauthorized") });
export type AuthorizationRequired = typeof sAuthorizationRequired.Type;

export const CurrentProfile = Context.Service<Profiles["Doc"]>("elianacorre/CurrentProfile");
export const CurrentAdmin = Context.Service<Profiles["Doc"]>("elianacorre/CurrentAdmin");

const resolveCurrentProfile = E.fn("resolveCurrentProfile")(function* (ctx: MutationCtx | QueryCtx) {
  return yield* E.provide(queryLayer(ctx.db))(
    E.gen(function* () {
      const user = yield* E.promise(async () => authComponent.safeGetAuthUser(ctx));
      if (!user) return yield* new sAuthenticationRequired({ message: "Unauthenticated" });

      const identity = yield* findIdentityByAdapterId(user._id);
      if (Option.isNone(identity)) return yield* new sAuthenticationRequired({ message: "Unauthenticated" });

      const profile = yield* findProfile(identity.value.profileId);
      if (Option.isNone(profile)) return yield* new sAuthenticationRequired({ message: "Unauthenticated" });

      return profile.value;
    })
  );
});

const resolveCurrentAdmin = E.fn("resolveCurrentAdmin")(function* (ctx: MutationCtx | QueryCtx) {
  const profile = yield* resolveCurrentProfile(ctx);
  if (profile.role !== "admin") return yield* new sAuthorizationRequired({ message: "Unauthorized" });
  return profile;
});

export const currentProfileLayer = (ctx: MutationCtx | QueryCtx) => L.effect(CurrentProfile, resolveCurrentProfile(ctx));
export const currentAdminLayer = (ctx: MutationCtx | QueryCtx) => L.effect(CurrentAdmin, resolveCurrentAdmin(ctx));
