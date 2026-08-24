import { register as registerBetterAuth } from "@convex-dev/better-auth/test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { sCanonicalEmail } from "@ec/domain/schemas/utils";
import { convexTest, type TestConvex } from "convex-test";
import { Schema as S } from "effect";
import { vi } from "vitest";

import { components } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "./test.setup";

const sAuthUser = S.Struct({ _id: S.String, email: sCanonicalEmail });
const sAuthSession = S.Struct({ _id: S.String });

export const createBackend = () => {
  vi.stubEnv("APP_SITE_URL", "https://app.example.com");
  vi.stubEnv("CAPABILITY_SIGNING_SECRET", "test-capability-secret");
  vi.stubEnv("SITE_URL", "https://www.elianacorre.com");
  vi.stubEnv("SUPPRESSION_HASH_SECRET", "test-suppression-secret");
  const convex = convexTest(schema, modules);
  registerBetterAuth(convex);
  registerRateLimiter(convex);
  return convex;
};

export const createIdentity = async (
  convex: TestConvex<typeof schema>,
  role: "admin" | "member",
  { emailVerified = true }: { emailVerified?: boolean } = {}
) => {
  const now = Date.now();
  const user = S.decodeUnknownSync(sAuthUser)(
    await convex.mutation(components.betterAuth.adapter.create, {
      input: {
        data: { createdAt: now, email: `${role}@example.com`, emailVerified, name: role, updatedAt: now },
        model: "user",
      },
    })
  );
  const session = S.decodeUnknownSync(sAuthSession)(
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
