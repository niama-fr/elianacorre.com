import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { internal } from "./_generated/api";
import { getAuthBaseUrl, getTrustedAuthOrigins, parseAuthBaseUrl } from "./auth";
import schema from "./schema";
import { modules } from "./test.setup";

describe("authentication identity synchronization", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the authenticated application origin for Better Auth", () => {
    vi.stubEnv("APP_SITE_URL", "https://app.example.com");
    vi.stubEnv("SITE_URL", "https://www.example.com");

    expect(getAuthBaseUrl()).toBe("https://app.example.com");
    expect(getTrustedAuthOrigins()).toStrictEqual(["https://app.example.com"]);
  });

  it.each([
    "not-a-url",
    "ftp://app.example.com",
    "https://user@app.example.com",
    "https://app.example.com/admin",
    "https://app.example.com?preview=true",
    "https://app.example.com#fragment",
  ])("rejects an authenticated application URL that is not an exact HTTP origin: %s", (value) => {
    expect(() => parseAuthBaseUrl(value)).toThrow("APP_SITE_URL must be an HTTP(S) origin");
  });

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
