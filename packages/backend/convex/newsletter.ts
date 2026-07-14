import { zNewsSubscriptionUpsert } from "@ec/domain/schemas/news-subscriptions";
import z from "zod";

import { confirmNewsletter, subscribeToNewsletter } from "../business/newsletter";
import { zMutation } from "./zod";

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
