import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zContactRequestCreateValues } from "@ec/domain/schemas/contact-requests";
import { createServerFn } from "@tanstack/react-start";

import { clientEnv } from "@/config/env";

// CONTACT ---------------------------------------------------------------------------------------------------------------------------------
export const createContactRequest = createServerFn({ method: "POST" })
  .validator(zContactRequestCreateValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(clientEnv.VITE_CONVEX_URL);
    return await convex.mutation(api.contactRequests.create, data);
  });
