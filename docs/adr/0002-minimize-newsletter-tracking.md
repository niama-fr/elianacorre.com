# Minimize newsletter tracking

## Status

Accepted for newsletter phase 1. Amended by NIA-28 on 2026-07-17 and NIA-35 on 2026-07-18.

## Context

Newsletter analytics must support operations and compliance without collecting behavior that is unnecessary for the approximately monthly relationship. Open tracking is both privacy-invasive and technically unreliable because it depends on tracking pixels.

## Decision

Disable newsletter open tracking and click tracking. Keep delivery, bounce, complaint, unsubscribe, and authenticated preference-center resubscription events for operational and compliance purposes.

## Consequences

Delivery issues must not treat opens or clicks as success or engagement evidence. Product reporting is limited to consent, delivery, bounce, complaint, unsubscribe, and authenticated preference-center resubscription events. A resubscription is consent evidence rather than engagement analytics.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
- [NIA-28](https://linear.app/niama/issue/NIA-28/make-newsletter-email-operations-production-ready)
- [NIA-35](https://linear.app/niama/issue/NIA-35/honor-loops-preference-center-resubscriptions-in-convex)
