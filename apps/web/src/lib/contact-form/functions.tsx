import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zContactCreateValues } from "@ec/domain/schemas/contacts";
import { createServerFn } from "@tanstack/react-start";

import { clientEnv } from "@/config/env";

// CONTACT ---------------------------------------------------------------------------------------------------------------------------------
export const createContact = createServerFn({ method: "POST" })
  .validator(zContactCreateValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    await convex.mutation(api.contacts.create, data);
  });
