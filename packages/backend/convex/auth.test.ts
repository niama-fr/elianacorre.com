import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("authentication identity synchronization", () => {
  it("creates and idempotently links a Profile for an authentication user", async () => {
    const convex = convexTest(schema, modules);
    const args = { doc: { _id: "better-auth-user", email: " AUTH@Example.COM " }, model: "user" };

    await convex.mutation(internal.auth.onCreate, args);
    await convex.mutation(internal.auth.onCreate, args);

    const state = await convex.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));
    expect(state.profiles).toMatchObject([{ email: "auth@example.com", role: "contact" }]);
    expect(state.identities).toMatchObject([
      {
        adapter: "better-auth",
        adapterId: "better-auth-user",
        profileId: state.profiles[0]?._id,
      },
    ]);
  });

  it("rejects a second authentication identity for the same Profile", async () => {
    const convex = convexTest(schema, modules);
    await convex.mutation(internal.auth.onCreate, {
      doc: { _id: "first-better-auth-user", email: "auth@example.com" },
      model: "user",
    });

    await expect(
      convex.mutation(internal.auth.onCreate, {
        doc: { _id: "second-better-auth-user", email: "auth@example.com" },
        model: "user",
      })
    ).rejects.toThrow("PROFILE_AUTH_IDENTITY_CONFLICT");

    const identities = await convex.run(async (ctx) => await ctx.db.query("identities").collect());
    expect(identities).toHaveLength(1);
  });
});
