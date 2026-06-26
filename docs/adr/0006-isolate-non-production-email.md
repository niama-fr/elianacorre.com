# Isolate non-production email

## Status

Accepted for newsletter phase 1.

## Context

Development, preview, and staging need realistic testing without exposing production subscriber data or accidentally sending to arbitrary real
addresses.

## Decision

Preview, development, and staging environments must never synchronize production subscribers or use production Loops credentials or contact
identifiers. They use a separate Loops environment or a local test adapter. Any manual delivery is restricted to an explicit allowlist of
project Google Workspace addresses.

## Consequences

Delivery issues must include environment-isolation checks and recovery steps for accidental credential exposure. Non-production verification
must prove that arbitrary real recipients and production contacts are unavailable.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
