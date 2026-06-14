import { createServerFn } from "@tanstack/react-start";
import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { zContactCreate } from "@/lib/domain";

// CONTACT ---------------------------------------------------------------------------------------------------------------------------------
export const createContact = createServerFn({ method: "POST" })
  .inputValidator(zContactCreate)
  .handler(async ({ data }) => {
    const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);
    await convex.mutation(api.contacts.create, data);
  });
