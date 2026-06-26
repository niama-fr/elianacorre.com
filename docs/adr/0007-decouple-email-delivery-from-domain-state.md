# Decouple email delivery from domain state

## Status

Accepted for newsletter phase 1.

## Context

Newsletter consent and welcome e-book access are domain state. Email delivery can fail or be delayed, so provider availability must not decide
whether a confirmation, withdrawal, or access right exists.

## Decision

Record newsletter requests, confirmations, withdrawals, and e-book rights transactionally in Convex without requiring Loops to be available.
Email work enters a durable queue with idempotent retries and backoff. Repeated failures create an administrative alert, while confirmation
still grants the immediate on-site e-book download.

## Consequences

Loops is an asynchronous delivery dependency rather than the authority for business state. Delivery issues must implement retry, replay, and
deduplication behavior without rolling back confirmed consent or e-book access because an email failed.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
