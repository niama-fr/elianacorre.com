import { type AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { zCanonicalEmail } from "@ec/domain/schemas/utils";
import { betterAuth } from "better-auth/minimal";
import { ConvexError } from "convex/values";

import { createIdentity, getIdentityByAdapterId, getIdentityByProfile } from "../data/identities";
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

        const identityByProfile = await getIdentityByProfile(ctx, profileId);
        if (identityByProfile) throw new ConvexError("PROFILE_AUTH_IDENTITY_CONFLICT");

        await createIdentity(ctx, { adapterId, profileId });
      },
    },
  },
});

export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

// AUTH ------------------------------------------------------------------------------------------------------------------------------------
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth({
    baseURL: env.SITE_URL,
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
  });

export const { getAuthUser } = authComponent.clientApi();
