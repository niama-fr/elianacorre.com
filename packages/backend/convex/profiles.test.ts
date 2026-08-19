/* oxlint-disable eslint/require-await, typescript/return-await -- Ref adapters return the Convex client's promises directly. */
import { Ref } from "@confect/core";
import { Effect as E } from "effect";
import { describe, expect, it } from "vitest";

import { sAuthenticationRequired } from "../runtime/current-profile";
import { currentProfile } from "../runtime/profiles-contract";
import { api } from "./_generated/api";
import { createBackend, createIdentity } from "./test.auth";

describe("authenticated Profile", () => {
  it.each(["admin", "member"] as const)("returns the Profile linked to an authenticated %s Account", async (role) => {
    const convex = createBackend();
    const asIdentity = await createIdentity(convex, role);

    await expect(asIdentity.query(api.profiles.current)).resolves.toMatchObject({
      email: `${role}@example.com`,
      role,
    });
  });

  it("rejects an unauthenticated caller", async () => {
    const convex = createBackend();

    await expect(convex.query(api.profiles.current)).rejects.toThrow("Unauthenticated");
  });

  it("resolves an authenticated Profile without requiring a verified provider email", async () => {
    const convex = createBackend();
    const asIdentity = await createIdentity(convex, "member", { emailVerified: false });

    await expect(asIdentity.query(api.profiles.current)).resolves.toMatchObject({ role: "member" });
  });
});

describe("Effect Profiles production architecture", () => {
  it("derives the typed Ref identity from the same descriptor used for native registration", () => {
    expect(Ref.getConvexFunctionName(currentProfile.ref)).toBe("profiles:current");
  });

  it("runs the authenticated query through a Confect ref", async () => {
    const convex = createBackend();
    const asIdentity = await createIdentity(convex, "member");

    const profile = await E.runPromise(
      Ref.runWithCodec(currentProfile.ref, {}, async (reference, args) => asIdentity.query(reference, args))
    );

    expect(profile).toMatchObject({ email: "member@example.com", role: "member" });
  });

  it("decodes a declared authentication error across the Convex boundary", async () => {
    const convex = createBackend();

    const error = await E.runPromise(
      Ref.runWithCodec(currentProfile.ref, {}, async (reference, args) => convex.query(reference, args)).pipe(E.flip)
    );

    expect(error).toBeInstanceOf(sAuthenticationRequired);
    expect(error.message).toBe("Unauthenticated");
  });
});
