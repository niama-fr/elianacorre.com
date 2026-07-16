import { zNewsSubscriptionUpsert } from "@ec/domain/schemas/news-subscriptions";
import z from "zod";

import { confirmNewsletter, subscribeToNewsletter } from "../business/newsletter";
import { createNewsletterDataExport } from "../business/newsletter-export";
import { zAdminQuery, zMutation } from "./zod";

// QUERIES ---------------------------------------------------------------------------------------------------------------------------------
export const exportData = zAdminQuery({
  args: { format: z.enum(["csv", "json"]) },
  handler: async (ctx, { format }) => await createNewsletterDataExport(ctx, format),
});

// MUTATIONS -------------------------------------------------------------------------------------------------------------------------------
export const confirm = zMutation({
  args: { token: z.string() },
  handler: async (ctx, { token }) => await confirmNewsletter(ctx, { now: Date.now(), token }),
});

export const subscribe = zMutation({
  args: zNewsSubscriptionUpsert,
  handler: async (ctx, args) => {
    await subscribeToNewsletter(ctx, { now: Date.now(), ...args });
  },
});
