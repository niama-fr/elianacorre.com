import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";

import { components } from "./convex/_generated/api";
import type { MutationCtx } from "./convex/_generated/server";

// CONSTS ----------------------------------------------------------------------------------------------------------------------------------
const NEWSLETTER_RATE_LIMIT_WINDOW_MS = 15 * MINUTE;

const newsletterRateLimiter = new RateLimiter(components.rateLimiter, {
  ebookRecoveryByEmail: { kind: "fixed window", period: NEWSLETTER_RATE_LIMIT_WINDOW_MS, rate: 3 },
  ebookRecoveryByIp: { kind: "fixed window", period: NEWSLETTER_RATE_LIMIT_WINDOW_MS, rate: 3 },
  newsletterByEmail: { kind: "fixed window", period: NEWSLETTER_RATE_LIMIT_WINDOW_MS, rate: 3 },
  newsletterByIp: { kind: "fixed window", period: NEWSLETTER_RATE_LIMIT_WINDOW_MS, rate: 3 },
});

// CHECK -----------------------------------------------------------------------------------------------------------------------------------
export const tryConsumeNewsletterRateLimit = async (ctx: MutationCtx, { email, requestIp }: TryConsumeNewsletterRateLimitOpts) => {
  // Simpler than a coordinated pre-check: each dimension consumes independently.
  const [emailLimit, ipLimit] = await Promise.all([
    newsletterRateLimiter.limit(ctx, "newsletterByEmail", { key: email }),
    newsletterRateLimiter.limit(ctx, "newsletterByIp", { key: requestIp }),
  ]);

  return emailLimit.ok && ipLimit.ok;
};
type TryConsumeNewsletterRateLimitOpts = { email: string; requestIp: string };

export const tryConsumeEbookRecoveryRateLimit = async (ctx: MutationCtx, { email, requestIp }: TryConsumeNewsletterRateLimitOpts) => {
  const [emailLimit, ipLimit] = await Promise.all([
    newsletterRateLimiter.limit(ctx, "ebookRecoveryByEmail", { key: email }),
    newsletterRateLimiter.limit(ctx, "ebookRecoveryByIp", { key: requestIp }),
  ]);

  return emailLimit.ok && ipLimit.ok;
};
