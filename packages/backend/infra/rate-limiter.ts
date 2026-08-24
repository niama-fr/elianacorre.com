import type { RateLimitConfig } from "@convex-dev/rate-limiter";
import RateLimiter from "@convex-dev/rate-limiter";
import { Effect as E, Schema as S } from "effect";

import { components } from "../confect/_generated/components";
import { MutationCtx } from "../confect/_generated/services";

// ERRORS ----------------------------------------------------------------------------------------------------------------------------------
export class RateLimitExceeded extends S.TaggedError<RateLimitExceeded>()("RateLimitExceeded", { name: S.String, retryAfter: S.Natural }) {}

// HELPERS ---------------------------------------------------------------------------------------------------------------------------------
export const makeRateLimiter = <const Config extends Record<string, RateLimitConfig>>(config: Config) => {
  const rateLimiter = new RateLimiter<Record<string, RateLimitConfig>>(components.rateLimiter, config);

  return {
    limit: E.fn(function* (name: Extract<keyof Config, string>, key: string) {
      const ctx = yield* MutationCtx;
      const result = yield* E.promise(async () => await rateLimiter.limit<string>(ctx, name, { key }));
      if (!result.ok) return yield* new RateLimitExceeded({ name, retryAfter: result.retryAfter });
    }),
  };
};
