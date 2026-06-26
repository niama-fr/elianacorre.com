import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zContactCreateValues } from "@ec/domain/contacts";
import { createServerFn } from "@tanstack/solid-start";

import { env } from "@/env";

// CONTACT ---------------------------------------------------------------------------------------------------------------------------------
export const createContact = createServerFn({ method: "POST" })
  .validator(zContactCreateValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(env.VITE_CONVEX_URL);
    await convex.mutation(api.contacts.create, data);
  });
