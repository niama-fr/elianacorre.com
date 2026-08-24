import { mutationLayer } from "@confect/server/RegisteredConvexFunction";
import { type AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { betterAuth } from "better-auth/minimal";
import { ConvexError } from "convex/values";
import { Effect as E, Option as O, Schema as S } from "effect";

import databaseSchema from "../confect/_generated/schema";
import authConfig from "../confect/auth";
import { components, internal } from "../convex/_generated/api";
import type { DataModel } from "../convex/_generated/dataModel";
import { env } from "../convex/_generated/server";
import { createIdentity, getIdentityByProfileId } from "../data/identities";
import { createMemberProfile, getProfileByEmail } from "../data/profiles";

// CONST -----------------------------------------------------------------------------------------------------------------------------------
const AUTH_PLACEHOLDER_EMAIL_DOMAIN = "auth.invalid";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
export const sBaseUrl = S.URLFromString.check(
  S.makeFilter((url) =>
    (url.protocol === "http:" || url.protocol === "https:") && url.href === `${url.origin}/`
      ? undefined
      : "APP_SITE_URL must be an HTTP(S) origin without a path, query, hash, or credentials"
  )
);

// FUNCTIONS -------------------------------------------------------------------------------------------------------------------------------
const authFunctions: AuthFunctions = internal.auth;

export function getProviderPlaceholderEmail(provider: "facebook" | "twitter", providerAccountId: string) {
  return `${provider}.${providerAccountId}@${AUTH_PLACEHOLDER_EMAIL_DOMAIN}`;
}

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, user) => {
        await E.runPromise(
          E.gen(function* () {
            const canonicalEmail = S.decodeOption(sCanonicalEmail)(user.email);

            const matchingProfile = O.isSome(canonicalEmail) ? yield* getProfileByEmail(canonicalEmail.value) : O.none();

            const adminProfile = matchingProfile.pipe(O.filter(({ role }) => role === "admin"));

            const profileId = O.isSome(adminProfile) ? adminProfile.value._id : yield* createMemberProfile();

            if (O.isSome(adminProfile)) {
              const existingAdminIdentity = yield* getIdentityByProfileId(adminProfile.value._id);

              if (O.isSome(existingAdminIdentity)) return yield* E.die(new ConvexError("PROFILE_AUTH_IDENTITY_CONFLICT"));
            }

            yield* createIdentity({
              adapterId: user._id,
              profileId,
            });
          }).pipe(E.provide(mutationLayer(databaseSchema, ctx)))
        );
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

// AUTH ------------------------------------------------------------------------------------------------------------------------------------
export function createAuth(ctx: GenericCtx<DataModel>) {
  const baseURL = S.decodeSync(sBaseUrl)(env.APP_SITE_URL).origin;

  return betterAuth({
    account: {
      accountLinking: {
        allowDifferentEmails: false,
      },
    },
    advanced: {
      disableOriginCheck: false,
    },
    baseURL,
    database: authComponent.adapter(ctx),
    plugins: [convex({ authConfig })],
    rateLimit: {
      enabled: true,
      storage: "database",
    },
    socialProviders: {
      facebook: {
        clientId: env.FACEBOOK_CLIENT_ID,
        clientSecret: env.FACEBOOK_CLIENT_SECRET,
        mapProfileToUser: (profile) => ({
          email: profile.email ?? getProviderPlaceholderEmail("facebook", profile.id),
        }),
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
      twitter: {
        clientId: env.TWITTER_CLIENT_ID,
        clientSecret: env.TWITTER_CLIENT_SECRET,
        mapProfileToUser: (profile) => ({
          email: profile.data.email ?? getProviderPlaceholderEmail("twitter", profile.data.id),
        }),
      },
    },
    trustedOrigins: [baseURL],
  });
}

export const { getAuthUser } = authComponent.clientApi();
