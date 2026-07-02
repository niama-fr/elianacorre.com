import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("contact requests", () => {
  it("reuses one profile for a person's contact requests", async () => {
    const convex = convexTest(schema, modules);
    const request = {
      email: "reader@example.com",
      forename: "Ada",
      message: "Please contact me.",
      surname: "Lovelace",
    } as const;

    await convex.mutation(api.contacts.create, request);
    await convex.mutation(api.contacts.create, {
      ...request,
      email: "READER@example.com",
      message: "A second question.",
    });

    const state = await convex.run(async (ctx) => ({
      contactRequests: await ctx.db.query("contactRequests").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));
    expect(state.profiles).toMatchObject([
      {
        email: "reader@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        role: "contact",
      },
    ]);
    expect(state.contactRequests).toMatchObject([
      { message: "Please contact me.", profileId: state.profiles[0]?._id },
      { message: "A second question.", profileId: state.profiles[0]?._id },
    ]);
  });

  it("migrates legacy contacts into profiles without changing an existing role", async () => {
    const convex = convexTest(schema, modules);
    await convex.run(async (ctx) => {
      await ctx.db.insert("profiles", { email: "reader@example.com", role: "member", userId: null });
      await ctx.db.insert("contacts", {
        email: "reader@example.com",
        forename: "Ada",
        message: "A migrated question.",
        surname: "Lovelace",
      });
    });

    await convex.mutation(internal.migrations.migrateContactsToProfiles, { cursor: null });

    const state = await convex.run(async (ctx) => ({
      contactRequests: await ctx.db.query("contactRequests").collect(),
      legacyContacts: await ctx.db.query("contacts").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));
    expect(state.legacyContacts).toHaveLength(0);
    expect(state.profiles).toMatchObject([{ firstName: "Ada", lastName: "Lovelace", role: "member" }]);
    expect(state.contactRequests).toMatchObject([{ message: "A migrated question.", profileId: state.profiles[0]?._id }]);
  });
});
