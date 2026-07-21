import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

describe("contact requests", () => {
  it("reuses one profile for a person's contact requests", async () => {
    const convex = convexTest(schema, modules);
    const request = {
      email: "reader@example.com",
      firstName: "Ada",
      message: "Please contact me.",
    } as const;

    await convex.mutation(api.contactRequests.create, request);
    await convex.mutation(api.contactRequests.create, {
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
        role: "contact",
      },
    ]);
    expect(state.contactRequests).toMatchObject([
      { message: "Please contact me.", profileId: state.profiles[0]?._id },
      { message: "A second question.", profileId: state.profiles[0]?._id },
    ]);
  });
});
