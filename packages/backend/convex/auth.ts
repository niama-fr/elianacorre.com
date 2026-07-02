import { type AuthFunctions, createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { normalizeProfileEmail } from "@ec/domain/schemas/profiles";
import { betterAuth } from "better-auth/minimal";

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
      onCreate: async (ctx, doc) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_email", (q) => q.eq("email", normalizeProfileEmail(doc.email)))
          .unique();
        if (profile?.role === "admin" && profile.userId === null) await ctx.db.patch(profile._id, { userId: doc._id });
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
