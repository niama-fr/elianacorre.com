import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { convexTest, type TestConvex } from "convex-test";
import { vi } from "vitest";
import { z } from "zod";

import { components } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const zAuthUser = z.object({ _id: z.string(), email: z.email() });
const zAuthSession = z.object({ _id: z.string() });

export const createBackend = () => {
  vi.stubEnv("CAPABILITY_SIGNING_SECRET", "test-capability-secret");
  vi.stubEnv("SITE_URL", "https://www.elianacorre.com");
  vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");
  const convex = convexTest(schema, modules);
  registerBetterAuth(convex);
  return convex;
};

export const createIdentity = async (convex: TestConvex<typeof schema>, role: "admin" | "member") => {
  const now = Date.now();
  const user = zAuthUser.parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: now, email: `${role}@example.com`, emailVerified: true, name: role, updatedAt: now },
        model: "user",
      },
    })
  );
  const session = zAuthSession.parse(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: now, expiresAt: now + 60_000, token: `${role}-session`, updatedAt: now, userId: user._id },
        model: "session",
      },
    })
  );
  await convex.run(async (ctx) => {
    const profileId = await ctx.db.insert("profiles", { email: user.email, role });
    await ctx.db.insert("identities", { adapter: "better-auth", adapterId: user._id, profileId });
  });
  return convex.withIdentity({ sessionId: session._id, subject: user._id });
};
