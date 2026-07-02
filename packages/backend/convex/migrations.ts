import { normalizeProfileEmail } from "@ec/domain/schemas/profiles";
import { z } from "zod";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { zInternalMutation } from "./zod";

const MIGRATION_BATCH_SIZE = 50;

export const migrateContactsToProfiles = zInternalMutation({
  args: { cursor: z.string().nullable() },
  handler: async (ctx, { cursor }): Promise<{ migrated: number; nextCursor: string | null }> => {
    const page = await ctx.db.query("contacts").paginate({ cursor, numItems: MIGRATION_BATCH_SIZE });
    const contactsByEmail = new Map<string, Doc<"contacts">[]>();
    for (const contact of page.page) {
      const email = normalizeProfileEmail(contact.email);
      const contacts = contactsByEmail.get(email) ?? [];
      contacts.push(contact);
      contactsByEmail.set(email, contacts);
    }

    await Promise.all(
      [...contactsByEmail].map(async ([email, contacts]) => {
        const [latestContact] = contacts.slice(-1);
        if (latestContact === undefined) return;
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_email", (query) => query.eq("email", email))
          .unique();
        const profileId =
          profile?._id ??
          (await ctx.db.insert("profiles", {
            email,
            firstName: latestContact.forename,
            lastName: latestContact.surname,
            role: "contact",
            userId: null,
          }));
        if (profile !== null) await ctx.db.patch(profile._id, { firstName: latestContact.forename, lastName: latestContact.surname });
        await Promise.all(
          contacts.map(async (contact) => {
            await ctx.db.insert("contactRequests", { message: contact.message, profileId });
            await ctx.db.delete(contact._id);
          })
        );
      })
    );

    if (!page.isDone) await ctx.scheduler.runAfter(0, internal.migrations.migrateContactsToProfiles, { cursor: page.continueCursor });

    return { migrated: page.page.length, nextCursor: page.isDone ? null : page.continueCursor };
  },
});
