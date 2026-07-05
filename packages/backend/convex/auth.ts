import { type AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { zCanonicalEmail } from "@ec/domain/schemas/utils";
import { betterAuth } from "better-auth/minimal";
import { ConvexError } from "convex/values";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { env } from "./_generated/server";
import authConfig from "./auth.config";

// CONST -----------------------------------------------------------------------------------------------------------------------------------
const AUTH_ADAPTER = "better-auth";

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

        const identityByAdapterId = await ctx.db
          .query("identities")
          .withIndex("by_adapter_and_adapter_id", (q) => q.eq("adapter", AUTH_ADAPTER).eq("adapterId", adapterId))
          .unique();
        if (identityByAdapterId) return;

        const existingProfile = await ctx.db
          .query("profiles")
          .withIndex("by_email", (q) => q.eq("email", emailParsed.data))
          .unique();
        const profileId = existingProfile?._id ?? (await ctx.db.insert("profiles", { email: emailParsed.data, role: "contact" }));

        const identityByProfile = await ctx.db
          .query("identities")
          .withIndex("by_profile_id_and_adapter", (q) => q.eq("profileId", profileId).eq("adapter", AUTH_ADAPTER))
          .unique();
        if (identityByProfile) throw new ConvexError("PROFILE_AUTH_IDENTITY_CONFLICT");

        await ctx.db.insert("identities", { adapter: AUTH_ADAPTER, adapterId, profileId });
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
