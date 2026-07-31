import { type AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { zCanonicalEmail } from "@ec/domain/schemas/utils";
import { betterAuth } from "better-auth/minimal";
import { ConvexError } from "convex/values";

import { createIdentity, getIdentityByAdapterId, getIdentityByProfileId } from "../data/identities";
import { ensureContactProfileId } from "../data/profiles";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { env } from "./_generated/server";
import authConfig from "./auth.config";

// FUNCTIONS -------------------------------------------------------------------------------------------------------------------------------
const authFunctions: AuthFunctions = internal.auth;

// COMPONENT -------------------------------------------------------------------------------------------------------------------------------
export const authComponent = createClient<DataModel>(components.betterAuth, {
  authFunctions,
  triggers: {
    user: {
      onCreate: async (ctx, { _id: adapterId, email }) => {
        const emailParsed = zCanonicalEmail.safeParse(email);
        if (!emailParsed.success) throw new ConvexError("INVALID_BETTERAUTH_EMAIL");

        const identityByAdapterId = await getIdentityByAdapterId(ctx, adapterId);
        if (identityByAdapterId) return;

        const profileId = await ensureContactProfileId(ctx, { email: emailParsed.data });

        const identityByProfile = await getIdentityByProfileId(ctx, profileId);
        if (identityByProfile) throw new ConvexError("PROFILE_AUTH_IDENTITY_CONFLICT");

        await createIdentity(ctx, { adapterId, profileId });
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

// AUTH ------------------------------------------------------------------------------------------------------------------------------------
export const parseAuthBaseUrl = (value: string): string => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("APP_SITE_URL must be an HTTP(S) origin without a path, query, or hash");
  }
  const isHttpOrigin = url.protocol === "http:" || url.protocol === "https:";
  const hasOnlyOrigin = url.pathname === "/" && url.search === "" && url.hash === "" && url.username === "" && url.password === "";
  if (!(isHttpOrigin && hasOnlyOrigin)) throw new Error("APP_SITE_URL must be an HTTP(S) origin without a path, query, or hash");
  return url.origin;
};

export const getAuthBaseUrl = (): string => parseAuthBaseUrl(env.APP_SITE_URL);

export const getTrustedAuthOrigins = (): string[] => [getAuthBaseUrl()];

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: getAuthBaseUrl(),
    database: authComponent.adapter(ctx),
    plugins: [convex({ authConfig })],
    rateLimit: {
      storage: "database",
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    trustedOrigins: getTrustedAuthOrigins(),
  });

export const { getAuthUser } = authComponent.clientApi();
