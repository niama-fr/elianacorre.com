import { describe, expect, it } from "vitest";

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
});
