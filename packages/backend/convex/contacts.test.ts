import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("contact requests", () => {
  it("creates a contact request through Convex", async () => {
    const convex = convexTest(schema, modules);

    await expect(
      convex.mutation(api.contacts.create, {
        email: "reader@example.com",
        forename: "Ada",
        message: "Please contact me.",
        surname: "Lovelace",
      })
    ).resolves.toStrictEqual(expect.any(String));
  });
});
