import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { z } from "@ec/validation/zod";
import { convexTest, type TestConvex } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, components, internal } from "./_generated/api";
import { getProviderPlaceholderEmail, zBaseUrl } from "./auth";
import schema from "./schema";
import { modules } from "./test.setup";

const zBetterAuthUser = z.object({ _id: z.string(), email: z.string(), emailVerified: z.boolean() });
const zBetterAuthAccount = z.object({ _id: z.string(), providerId: z.string(), userId: z.string() });
const zBetterAuthSession = z.object({ _id: z.string() });

const createBetterAuthUser = async (convex: TestConvex<typeof schema>, email: string, name = "Member", emailVerified = true) => {
  const now = Date.now();
  return zBetterAuthUser.parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: now, email, emailVerified, name, updatedAt: now },
        model: "user",
      },
    })
  );
};

const attachProvider = async (convex: TestConvex<typeof schema>, userId: string, providerId: "facebook" | "google" | "twitter") =>
  await convex.mutation(internal.auth.onCreate, {
    doc: { _id: `${providerId}-${userId}`, providerId, userId },
    model: "account",
  });

describe("authentication URL validation", () => {
  it.each([
    ["https://app.example.com", "https://app.example.com"],
    ["https://app.example.com/", "https://app.example.com"],
    ["http://localhost:3000", "http://localhost:3000"],
  ])("normalizes an exact HTTP(S) origin: %s", (value, expected) => {
    expect(zBaseUrl.parse(value)).toBe(expected);
  });

  it.each([
    "not-a-url",
    "ftp://app.example.com",
    "https://user@app.example.com",
    "https://app.example.com/admin",
    "https://app.example.com?preview=true",
    "https://app.example.com#fragment",
  ])("rejects a value that is not an exact HTTP(S) origin: %s", (value) => {
    expect(zBaseUrl.safeParse(value).success).toBeFalsy();
  });

  it.each([
    ["facebook", "123456", "facebook.123456@auth.invalid"],
    ["twitter", "987654", "twitter.987654@auth.invalid"],
  ] as const)("creates a provider-scoped non-contact placeholder for %s", (provider, providerAccountId, expected) => {
    expect(getProviderPlaceholderEmail(provider, providerAccountId)).toBe(expected);
  });
});

describe("authentication identity synchronization", () => {
  it("creates and idempotently links a member Profile for a Google authentication user", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const user = await createBetterAuthUser(convex, " AUTH@Example.COM ");

    await attachProvider(convex, user._id, "google");
    await attachProvider(convex, user._id, "google");

    const state = await convex.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));

    expect(state.profiles).toMatchObject([{ role: "member" }]);
    expect(state.profiles[0]).not.toHaveProperty("email");
    expect(state.identities).toMatchObject([
      {
        adapter: "better-auth",
        adapterId: user._id,
        profileId: state.profiles[0]?._id,
      },
    ]);
  });

  it("resolves a Facebook callback with an unverified provider email to its canonical member Profile", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const now = Date.now();
    const user = await createBetterAuthUser(convex, "facebook-member@example.com", "Facebook member", false);
    const account = zBetterAuthAccount.parse(
      await convex.mutation(components.betterAuth.adapter.create, {
        input: {
          data: {
            accountId: "facebook-provider-subject",
            createdAt: now,
            providerId: "facebook",
            updatedAt: now,
            userId: user._id,
          },
          model: "account",
        },
      })
    );
    await convex.mutation(internal.auth.onCreate, { doc: account, model: "account" });
    const session = zBetterAuthSession.parse(
      await convex.mutation(components.betterAuth.adapter.create, {
        input: {
          data: {
            createdAt: now,
            expiresAt: now + 60_000,
            token: "facebook-session",
            updatedAt: now,
            userId: user._id,
          },
          model: "session",
        },
      })
    );

    expect(user.emailVerified).toBeFalsy();
    await expect(convex.withIdentity({ sessionId: session._id, subject: user._id }).query(api.profiles.current)).resolves.toMatchObject({
      role: "member",
    });
    await expect(
      convex.run(async (ctx) => ({
        ebookIssuances: await ctx.db.query("ebookIssuances").collect(),
        loopsTasks: await ctx.db.query("loopsTasks").collect(),
        profile: await ctx.db.query("profiles").unique(),
      }))
    ).resolves.toMatchObject({ ebookIssuances: [], loopsTasks: [], profile: { role: "member" } });
  });

  it("does not associate an authentication user with an existing Profile from a matching email", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const existingProfileId = await convex.run(
      async (ctx) => await ctx.db.insert("profiles", { email: "auth@example.com", role: "contact" })
    );
    const user = await createBetterAuthUser(convex, "auth@example.com");

    await attachProvider(convex, user._id, "facebook");

    const state = await convex.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));
    expect(state.identities).toHaveLength(1);
    expect(state.profiles).toHaveLength(2);
    expect(state.identities[0]?.profileId).not.toBe(existingProfileId);
  });

  it("keeps independently authenticated provider Accounts with different emails separate", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const googleUser = await createBetterAuthUser(convex, "member@example.com", "Google member");
    const facebookUser = await createBetterAuthUser(convex, "meta-member@example.com", "Meta member");

    await attachProvider(convex, googleUser._id, "google");
    await attachProvider(convex, facebookUser._id, "facebook");

    const state = await convex.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));
    expect(state.identities).toHaveLength(2);
    expect(state.profiles).toHaveLength(2);
    expect(state.profiles[0]).not.toHaveProperty("email");
    expect(state.profiles[1]).not.toHaveProperty("email");
    expect(state.identities[0]?.profileId).not.toBe(state.identities[1]?.profileId);
  });

  it("does not move a Profile when the Authentication Provider email changes", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const user = await createBetterAuthUser(convex, "original@example.com");
    await attachProvider(convex, user._id, "twitter");

    await convex.mutation(internal.auth.onUpdate, {
      model: "user",
      newDoc: { _id: user._id, email: "changed@example.com" },
      oldDoc: { _id: user._id, email: "original@example.com" },
    });

    const state = await convex.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));
    expect(state.profiles[0]).not.toHaveProperty("email");
    expect(state.identities).toMatchObject([{ adapterId: user._id, profileId: state.profiles[0]?._id }]);
  });

  it("links the existing explicitly provisioned administrator Profile through Google", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const adminProfileId = await convex.run(async (ctx) => await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" }));
    const adminUser = await createBetterAuthUser(convex, "admin@example.com", "Admin");

    await attachProvider(convex, adminUser._id, "google");

    const identities = await convex.run(async (ctx) => await ctx.db.query("identities").collect());
    expect(identities).toContainEqual(expect.objectContaining({ adapterId: adminUser._id, profileId: adminProfileId }));
  });

  it("rejects a Google administrator association when the Profile already has an authentication identity", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const adminProfileId = await convex.run(async (ctx) => {
      const profileId = await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" });
      await ctx.db.insert("identities", { adapter: "better-auth", adapterId: "existing-admin-user", profileId });
      return profileId;
    });
    const user = await createBetterAuthUser(convex, "admin@example.com", "Other");

    await expect(attachProvider(convex, user._id, "google")).rejects.toThrow("PROFILE_AUTH_IDENTITY_CONFLICT");

    const identities = await convex.run(async (ctx) => await ctx.db.query("identities").collect());
    expect(identities).toStrictEqual([expect.objectContaining({ adapterId: "existing-admin-user", profileId: adminProfileId })]);
  });

  it("does not associate a non-Google Account with an administrator Profile from email", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const adminProfileId = await convex.run(async (ctx) => await ctx.db.insert("profiles", { email: "admin@example.com", role: "admin" }));
    const user = await createBetterAuthUser(convex, "admin@example.com", "Meta user");
    await attachProvider(convex, user._id, "facebook");

    const identity = await convex.run(async (ctx) => await ctx.db.query("identities").unique());
    expect(identity?.profileId).not.toBe(adminProfileId);
  });

  it("does not associate a new Account with an existing member Profile from email", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const existingProfileId = await convex.run(
      async (ctx) => await ctx.db.insert("profiles", { email: "member@example.com", role: "member" })
    );
    const user = await createBetterAuthUser(convex, "member@example.com", "New provider account");
    await attachProvider(convex, user._id, "twitter");

    const identity = await convex.run(async (ctx) => await ctx.db.query("identities").unique());
    expect(identity?.profileId).not.toBe(existingProfileId);
  });

  it("creates an email-independent member Profile for X when Better Auth has only an internal placeholder", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);
    const user = await createBetterAuthUser(convex, getProviderPlaceholderEmail("twitter", "123456"));
    await attachProvider(convex, user._id, "twitter");

    const profiles = await convex.run(async (ctx) => await ctx.db.query("profiles").collect());
    expect(profiles).toMatchObject([{ role: "member" }]);
    expect(profiles[0]).not.toHaveProperty("email");
  });
});
