import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { zContactCreate } from "@ec/domain/contacts";
import { createServerFn } from "@tanstack/solid-start";

// CONTACT ---------------------------------------------------------------------------------------------------------------------------------
export const createContact = createServerFn({ method: "POST" })
  .inputValidator(zContactCreate)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(import.meta.env.VITE_CONVEX_URL);
    await convex.mutation(api.contacts.create, data);
  });
