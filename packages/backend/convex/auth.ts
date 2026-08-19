import { type AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { z } from "@ec/validation/zod";
import { betterAuth } from "better-auth/minimal";
import { ConvexError } from "convex/values";
import { Effect as E, Option, Schema as S } from "effect";

import { findIdentityByProfileId, insertIdentity } from "../data/identities";
import { findProfileByEmail, insertMemberProfile } from "../data/profiles";
import { mutationLayer } from "../runtime/database";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { env } from "./_generated/server";
import authConfig from "./auth.config";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const zHttpUrlObject = z.url({ protocol: /^https?$/u }).transform((value) => new URL(value));
const AUTH_PLACEHOLDER_EMAIL_DOMAIN = "auth.invalid";

export const zBaseUrl = zHttpUrlObject
  .refine((url) => url.href === `${url.origin}/`, "APP_SITE_URL must be an HTTP(S) origin without a path, query, hash, or credentials")
  .transform((url) => url.origin);

export function getProviderPlaceholderEmail(provider: "facebook" | "twitter", providerAccountId: string) {
  return `${provider}.${providerAccountId}@${AUTH_PLACEHOLDER_EMAIL_DOMAIN}`;
}

// FUNCTIONS -------------------------------------------------------------------------------------------------------------------------------
const authFunctions: AuthFunctions = internal.auth;

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, user) => {
        await E.runPromise(
          E.gen(function* () {
            const canonicalEmail = yield* S.decodeEffect(sCanonicalEmail)(user.email).pipe(E.option);
            const matchingProfile = Option.isSome(canonicalEmail) ? yield* findProfileByEmail(canonicalEmail.value) : Option.none();
            const adminProfile = matchingProfile.pipe(Option.filter((profile) => profile.role === "admin"));
            const profileId = Option.isSome(adminProfile) ? adminProfile.value._id : yield* insertMemberProfile;

            if (Option.isSome(adminProfile)) {
              const existingAdminIdentity = yield* findIdentityByProfileId(adminProfile.value._id);
              if (Option.isSome(existingAdminIdentity)) return yield* E.die(new ConvexError("PROFILE_AUTH_IDENTITY_CONFLICT"));
            }

            yield* insertIdentity({ adapterId: user._id, profileId });
          }).pipe(E.provide(mutationLayer(ctx.db)))
        );
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

// AUTH ------------------------------------------------------------------------------------------------------------------------------------
export function createAuth(ctx: GenericCtx<DataModel>) {
  const baseURL = zBaseUrl.parse(env.APP_SITE_URL);

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
