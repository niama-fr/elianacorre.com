# Decouple email delivery from domain state

## Status

Accepted for newsletter phase 1.

## Context

Newsletter consent and welcome e-book access are domain state. Email delivery can fail or be delayed, so provider availability must not decide whether a confirmation, withdrawal, or access right exists.

## Decision

Record newsletter requests, confirmations, withdrawals, and e-book rights transactionally in Convex without requiring Loops to be available. Email work creates an application-owned `loopsTasks` record in the same mutation as the relevant domain transition. A durable Convex Workflow then invokes the Loops component asynchronously. Workflow owns scheduling, retry backoff, and interrupted-step recovery; `loopsTasks` records the provider-specific intent and resulting pending, succeeded, or failed state. Transactional sends reuse a stable idempotency key across attempts. Confirmation still grants the immediate on-site e-book download independently of email delivery.

## Consequences

Loops is an asynchronous delivery dependency rather than the authority for business state. Delivery issues must implement retry, replay, and deduplication behavior without rolling back confirmed consent or e-book access because an email failed.

The phase-one baseline makes three attempts with exponential backoff beginning at one second. It proves durable asynchronous delivery but is not the production outage policy. NIA-28 owns the agreed replacement:

- confirmation email: up to 12 attempts, 30-second initial backoff, base 2, covering about 17 hours;
- e-book email: up to 14 attempts, 30-second initial backoff, base 2, covering about 68 hours;
- contact synchronization: up to 10 attempts, 60-second initial backoff, base 2, covering about 8.5 hours.

Only network failures, HTTP 429, and HTTP 5xx responses retry. Authentication, missing-template, validation, and other permanent failures stop immediately. The Loops boundary must expose structured status information rather than requiring application code to classify sanitized messages. Each task retains its Workflow identifier for diagnosis and restart; terminal failure creates an administrative alert; operator replay uses the original idempotency key.

Workflow integration tests are temporarily limited by an open `convex-test` compatibility issue. Existing tests cover task creation, provider execution, stable idempotency keys, failure preservation, and successful retry by driving the application steps directly. Replace that seam with the real Workflow test component when the upstream issue is resolved.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
