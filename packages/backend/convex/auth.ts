import { type AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { zCanonicalEmail } from "@ec/domain/schemas/utils";
import { z } from "@ec/validation/zod";
import { betterAuth } from "better-auth/minimal";
import { ConvexError } from "convex/values";

import { createIdentity, getIdentityByProfileId } from "../data/identities";
import { createMemberProfile, getProfileByEmail } from "../data/profiles";
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
        const emailParsed = zCanonicalEmail.safeParse(user.email);
        const adminProfile = emailParsed.success ? await getProfileByEmail(ctx, emailParsed.data) : undefined;
        const profileId = adminProfile?.role === "admin" ? adminProfile._id : await createMemberProfile(ctx);

        if (adminProfile?.role === "admin") {
          const existingAdminIdentity = await getIdentityByProfileId(ctx, adminProfile._id);
          if (existingAdminIdentity) throw new ConvexError("PROFILE_AUTH_IDENTITY_CONFLICT");
        }

        await createIdentity(ctx, { adapterId: user._id, profileId });
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
