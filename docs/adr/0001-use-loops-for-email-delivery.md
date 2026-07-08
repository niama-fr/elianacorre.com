# Use Loops for email delivery

## Status

Accepted for newsletter phase 1.

## Context

The platform needs double-opt-in confirmation, welcome e-book delivery, monthly campaign authoring, unsubscribe handling, and future lifecycle email without making the website a newsletter editor. The domain record must also preserve Convex as the authority for consent, people, purchases, subscriptions, and access rights.

## Decision

Use Loops from the first newsletter phase for transactional emails, monthly campaigns, and future lifecycle workflows. Convex remains the source of truth and provides provider-independent CSV or JSON export. Loops receives only confirmed contacts and the event properties needed for email delivery.

The application uses the `@devwithbobby/loops` Convex component for the Loops API boundary and its local provider projection. Application-owned `loopsTasks` records retain the delivery intent and visible outcome, while the `@convex-dev/workflow` component durably executes those tasks and owns scheduling, retries, and recovery of interrupted steps. Neither component owns Profiles, newsletter consent, delivery eligibility, or Welcome E-book Access.

Campaigns are drafted, previewed, tested, and scheduled in Loops, with Google Docs available for collaborative drafting. The site administration does not include a newsletter editor in phase 1.

## Consequences

This accepts Loops-specific operational code and records for one email platform that covers the planned newsletter, subscription, and training journeys. Provider identifiers remain lookup attributes rather than primary identity keys, and business state must not depend on Loops or either delivery component being available.

Replacing Loops would require a new provider integration and migration of the provider projection and pending operational tasks. It would not require changing authoritative Profiles, consent, delivery eligibility, or e-book rights.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
