import { RegisteredConvexFunction } from "@confect/server";
import { Effect as E } from "effect";
import { describe, expect, it } from "vitest";

import databaseSchema from "../../confect/_generated/schema";
import { api } from "../../convex/_generated/api";
import { submitContactRequest } from "../../features/contact-requests";
import { createBackend } from "./test.auth";

describe("contact requests", () => {
  it("reuses one profile for a person's contact requests", async () => {
    const convex = createBackend();
    const request = {
      email: "reader@example.com",
      firstName: "Ada",
      message: "Please contact me.",
      website: "",
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

  it("deduplicates an identical direct submission without consuming another persistence slot", async () => {
    const convex = createBackend();
    const request = { email: "reader@example.com", firstName: "Ada", message: "Please contact me.", website: "" } as const;

    const first = await convex.mutation(api.contactRequests.create, request);
    const second = await convex.mutation(api.contactRequests.create, request);

    expect(second).toBe(first);
    await expect(convex.run(async (ctx) => await ctx.db.query("contactRequests").collect())).resolves.toHaveLength(1);
  });

  it("accepts the same message again after the short deduplication window", async () => {
    const convex = createBackend();
    const request = { email: "reader@example.com", firstName: "Ada", message: "Please contact me.", website: "" } as const;
    await convex.mutation(api.contactRequests.create, request);
    const [first] = await convex.run(async (ctx) => await ctx.db.query("contactRequests").collect());
    if (!first) throw new Error("First contact request was not created");

    await convex.run(async (ctx) => {
      await E.runPromise(
        submitContactRequest({
          ...request,
          now: first._creationTime + 15 * 60 * 1000 + 1,
          requestIp: "203.0.113.11",
        }).pipe(E.provide(RegisteredConvexFunction.mutationLayer(databaseSchema, ctx)))
      );
    });

    await expect(convex.run(async (ctx) => await ctx.db.query("contactRequests").collect())).resolves.toHaveLength(2);
  });

  it("silently ignores the honeypot without consuming the fallback-IP limit", async () => {
    const convex = createBackend();
    const base = { firstName: "Ada", message: "Please contact me." } as const;
    for (let attempt = 0; attempt < 8; attempt += 1)
      await convex.mutation(api.contactRequests.create, {
        ...base,
        email: `bot-${attempt}@example.com`,
        website: "https://bot.example",
      });
    await convex.mutation(api.contactRequests.create, { ...base, email: "reader@example.com", website: "" });

    const state = await convex.run(async (ctx) => ({
      contactRequests: await ctx.db.query("contactRequests").collect(),
      profiles: await ctx.db.query("profiles").collect(),
    }));
    expect(state.contactRequests).toHaveLength(1);
    expect(state.profiles).toMatchObject([{ email: "reader@example.com" }]);
  });

  it("enforces email and fallback-IP limits on direct public calls", async () => {
    const emailLimited = createBackend();
    for (let attempt = 0; attempt < 4; attempt += 1)
      await emailLimited.mutation(api.contactRequests.create, {
        email: "reader@example.com",
        firstName: "Ada",
        message: `Question ${attempt}`,
        website: "",
      });
    await expect(emailLimited.run(async (ctx) => await ctx.db.query("contactRequests").collect())).resolves.toHaveLength(3);

    const ipLimited = createBackend();
    for (let attempt = 0; attempt < 6; attempt += 1)
      await ipLimited.mutation(api.contactRequests.create, {
        email: `reader-${attempt}@example.com`,
        firstName: "Ada",
        message: `Question ${attempt}`,
        website: "",
      });
    await expect(ipLimited.run(async (ctx) => await ctx.db.query("contactRequests").collect())).resolves.toHaveLength(5);
  });

  it("rejects caller-supplied request metadata at the public boundary", async () => {
    const convex = createBackend();

    await expect(
      convex.mutation(api.contactRequests.create, {
        email: "reader@example.com",
        firstName: "Ada",
        message: "Please contact me.",
        // @ts-expect-error -- requestIp is intentionally absent from the public contract.
        requestIp: "203.0.113.10",
        website: "",
      })
    ).rejects.toThrow("requestIp");
  });
});
