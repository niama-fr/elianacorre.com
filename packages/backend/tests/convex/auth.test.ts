import { Ref } from "@confect/core";
import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import refs from "@ec/backend/refs";
import { convexTest, type TestConvex } from "convex-test";
import { Effect as E, Schema as S } from "effect";
import { describe, expect, it } from "vitest";

import { components, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { getProviderPlaceholderEmail, sBaseUrl } from "../../runtime/better-auth";
import { modules } from "./test.setup";

// SCHEMAS ---------------------------------------------------------------------------------------------------------------------------------
const sBetterAuthUser = S.Struct({
  _id: S.String,
  email: S.String,
  emailVerified: S.Boolean,
});

const sBetterAuthSession = S.Struct({
  _id: S.String,
});

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
const createBetterAuthUser = async (convex: TestConvex<typeof schema>, email: string, name = "Member", emailVerified = true) => {
  const now = Date.now();

  return S.decodeUnknownSync(sBetterAuthUser)(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: {
          createdAt: now,
          email,
          emailVerified,
          name,
          updatedAt: now,
        },
        model: "user",
      },
    })
  );
};

const synchronizeUser = async (convex: TestConvex<typeof schema>, user: typeof sBetterAuthUser.Type) =>
  await convex.mutation(internal.auth.onCreate, { doc: user, model: "user" });

const createBetterAuthAccount = async (
  convex: TestConvex<typeof schema>,
  userId: string,
  providerId: "facebook" | "google" | "twitter"
): Promise<void> => {
  const now = Date.now();

  await convex.mutation(components.betterAuth.adapter.create, {
    input: {
      data: {
        accountId: `${providerId}-provider-subject`,
        createdAt: now,
        providerId,
        updatedAt: now,
        userId,
      },
      model: "account",
    },
  });
};

type QueryCaller = Pick<TestConvex<typeof schema>, "query">;

const getCurrentProfile = async (convex: QueryCaller) =>
  await E.runPromise(
    Ref.runWithCodec(refs.public.profiles.current, {}, async (functionReference, encodedArgs): Promise<unknown> => {
      const encodedReturns: unknown = await convex.query(functionReference, encodedArgs as never);
      return encodedReturns;
    })
  );

// TESTS -----------------------------------------------------------------------------------------------------------------------------------
describe("authentication URL validation", () => {
  it.each([
    ["https://app.example.com", "https://app.example.com"],
    ["https://app.example.com/", "https://app.example.com"],
    ["http://localhost:3000", "http://localhost:3000"],
  ])("normalizes an exact HTTP(S) origin: %s", (value, expected) => {
    expect(S.decodeSync(sBaseUrl)(value).origin).toBe(expected);
  });

  it.each([
    "not-a-url",
    "ftp://app.example.com",
    "https://user@app.example.com",
    "https://app.example.com/admin",
    "https://app.example.com?preview=true",
    "https://app.example.com#fragment",
  ])("rejects a value that is not an exact HTTP(S) origin: %s", (value) => {
    let rejected = false;
    try {
      S.decodeSync(sBaseUrl)(value);
    } catch {
      rejected = true;
    }
    expect(rejected).toBeTruthy();
  });

  it.each([
    ["facebook", "123456", "facebook.123456@auth.invalid"],
    ["twitter", "987654", "twitter.987654@auth.invalid"],
  ] as const)("creates a provider-scoped non-contact placeholder for %s", (provider, providerAccountId, expected) => {
    expect(getProviderPlaceholderEmail(provider, providerAccountId)).toBe(expected);
  });
});

describe("authentication identity synchronization", () => {
  it("creates one email-independent member Profile and Identity when a Better Auth User is created", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);

    const user = await createBetterAuthUser(convex, " AUTH@Example.COM ");

    await synchronizeUser(convex, user);

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

    await synchronizeUser(convex, user);
    await createBetterAuthAccount(convex, user._id, "facebook");

    const session = S.decodeUnknownSync(sBetterAuthSession)(
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

    await expect(
      getCurrentProfile(
        convex.withIdentity({
          sessionId: session._id,
          subject: user._id,
        })
      )
    ).resolves.toMatchObject({
      role: "member",
    });

    await expect(
      convex.run(async (ctx) => ({
        ebookIssuances: await ctx.db.query("ebookIssuances").collect(),
        loopsTasks: await ctx.db.query("loopsTasks").collect(),
        profile: await ctx.db.query("profiles").unique(),
      }))
    ).resolves.toMatchObject({
      ebookIssuances: [],
      loopsTasks: [],
      profile: {
        role: "member",
      },
    });
  });

  it("does not associate an authentication user with an existing Profile from a matching email", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);

    const existingProfileId = await convex.run(
      async (ctx) =>
        await ctx.db.insert("profiles", {
          email: "auth@example.com",
          role: "contact",
        })
    );

    const user = await createBetterAuthUser(convex, "auth@example.com");

    await synchronizeUser(convex, user);

    const state = await convex.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));

    expect(state.identities).toHaveLength(1);
    expect(state.profiles).toHaveLength(2);
    expect(state.identities[0]?.profileId).not.toBe(existingProfileId);
  });

  it("keeps one application Identity and Profile when multiple provider Accounts belong to one Better Auth User", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);

    const user = await createBetterAuthUser(convex, "member@example.com");

    await synchronizeUser(convex, user);
    await createBetterAuthAccount(convex, user._id, "google");
    await createBetterAuthAccount(convex, user._id, "facebook");

    const state = await convex.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));

    expect(state.identities).toHaveLength(1);
    expect(state.profiles).toHaveLength(1);
    expect(state.profiles[0]).not.toHaveProperty("email");

    expect(state.identities[0]).toMatchObject({
      adapterId: user._id,
      profileId: state.profiles[0]?._id,
    });
  });

  it("does not move a Profile when the Authentication Provider email changes", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);

    const user = await createBetterAuthUser(convex, "original@example.com");

    await synchronizeUser(convex, user);

    await convex.mutation(internal.auth.onUpdate, {
      model: "user",
      newDoc: {
        _id: user._id,
        email: "changed@example.com",
      },
      oldDoc: {
        _id: user._id,
        email: "original@example.com",
      },
    });

    const state = await convex.run(async (ctx) => ({
      identities: await ctx.db.query("identities").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));

    expect(state.profiles[0]).not.toHaveProperty("email");

    expect(state.identities).toMatchObject([
      {
        adapterId: user._id,
        profileId: state.profiles[0]?._id,
      },
    ]);
  });

  it("links a new Better Auth User to an explicitly provisioned administrator Profile by canonical email", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);

    const adminProfileId = await convex.run(
      async (ctx) =>
        await ctx.db.insert("profiles", {
          email: "admin@example.com",
          role: "admin",
        })
    );

    const adminUser = await createBetterAuthUser(convex, " ADMIN@Example.COM ", "Admin");

    await synchronizeUser(convex, adminUser);

    const identities = await convex.run(async (ctx) => await ctx.db.query("identities").collect());

    expect(identities).toContainEqual(
      expect.objectContaining({
        adapterId: adminUser._id,
        profileId: adminProfileId,
      })
    );
  });

  it("rejects administrator association when the Profile already has an authentication identity", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);

    const adminProfileId = await convex.run(async (ctx) => {
      const profileId = await ctx.db.insert("profiles", {
        email: "admin@example.com",
        role: "admin",
      });

      await ctx.db.insert("identities", {
        adapter: "better-auth",
        adapterId: "existing-admin-user",
        profileId,
      });

      return profileId;
    });

    const user = await createBetterAuthUser(convex, "admin@example.com", "Other");

    await expect(synchronizeUser(convex, user)).rejects.toThrow("PROFILE_AUTH_IDENTITY_CONFLICT");

    const identities = await convex.run(async (ctx) => await ctx.db.query("identities").collect());

    expect(identities).toStrictEqual([
      expect.objectContaining({
        adapterId: "existing-admin-user",
        profileId: adminProfileId,
      }),
    ]);
  });

  it("does not associate a new Account with an existing member Profile from email", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);

    const existingProfileId = await convex.run(
      async (ctx) =>
        await ctx.db.insert("profiles", {
          email: "member@example.com",
          role: "member",
        })
    );

    const user = await createBetterAuthUser(convex, "member@example.com", "New provider account");

    await synchronizeUser(convex, user);

    const identity = await convex.run(async (ctx) => await ctx.db.query("identities").unique());

    expect(identity?.profileId).not.toBe(existingProfileId);
  });

  it("creates an email-independent member Profile for X when Better Auth has only an internal placeholder", async () => {
    const convex = convexTest(schema, modules);
    registerBetterAuth(convex);

    const user = await createBetterAuthUser(convex, getProviderPlaceholderEmail("twitter", "123456"));

    await synchronizeUser(convex, user);

    const profiles = await convex.run(async (ctx) => await ctx.db.query("profiles").collect());

    expect(profiles).toMatchObject([{ role: "member" }]);
    expect(profiles[0]).not.toHaveProperty("email");
  });
});
