# Use Loops for email delivery

## Status

Accepted for newsletter phase 1.

## Context

The platform needs double-opt-in confirmation, welcome e-book delivery, monthly campaign authoring, unsubscribe handling, and future
lifecycle email without making the website a newsletter editor. The domain record must also preserve Convex as the authority for consent,
people, purchases, subscriptions, and access rights.

## Decision

Use Loops from the first newsletter phase for transactional emails, monthly campaigns, and future lifecycle workflows. Convex remains the
source of truth and provides provider-independent CSV or JSON export. Loops receives only confirmed contacts and the event properties needed
for email delivery.

Campaigns are drafted, previewed, tested, and scheduled in Loops, with Google Docs available for collaborative drafting. The site
administration does not include a newsletter editor in phase 1.

## Consequences

This accepts a REST integration without a dedicated Convex component in exchange for one email platform that covers the planned newsletter,
subscription, and training journeys. Delivery issues must keep provider identifiers as lookup attributes, not primary identity keys, and must
avoid coupling business state to Loops availability.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
