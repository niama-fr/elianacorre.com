# Minimize newsletter tracking

## Status

Accepted for newsletter phase 1.

## Context

Newsletter analytics must support operations and compliance without collecting behavior that is unnecessary for the approximately monthly
relationship. Open tracking is both privacy-invasive and technically unreliable because it depends on tracking pixels.

## Decision

Disable newsletter open tracking. Permit only limited click tracking when Loops can configure it transparently and the processing is disclosed
in the privacy policy. Keep delivery, bounce, complaint, and unsubscribe events for operational and compliance purposes.

## Consequences

Delivery issues must not treat opens as success or engagement evidence. Product reporting is limited to consent, delivery, bounce, complaint,
unsubscribe, and explicitly disclosed click events.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
