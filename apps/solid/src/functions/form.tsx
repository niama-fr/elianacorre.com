import { api } from "@ec/backend/api";
import { createConvexHttpClient } from "@ec/backend/client";
import { submitContact, zContactCreateValues } from "@ec/domain/contacts";
import { createServerFn } from "@tanstack/solid-start";

// CONTACT ---------------------------------------------------------------------------------------------------------------------------------
export const createContact = createServerFn({ method: "POST" })
  .inputValidator(zContactCreateValues)
  .handler(async ({ data }) => {
    const convex = createConvexHttpClient(import.meta.env.VITE_CONVEX_URL);
    await submitContact(data, async (contact) => {
      await convex.mutation(api.contacts.create, contact);
    });
  });
