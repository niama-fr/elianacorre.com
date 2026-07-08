# Use Better Auth for platform identities

## Status

Accepted for newsletter phase 1. The Solid-specific framework decision is superseded by [ADR 0008](0008-replace-solid-with-react.md).

## Context

Phase 1 needs authenticated content administrators, and later paid subscriptions and training purchases need customer identities. The application uses the supported React TanStack Start and Convex integration without making newsletter subscription an account concept.

## Decision

Use Better Auth with Convex for administrative and future customer identities. Phase 1 enables Google sign-in only for explicitly authorized content administrators stored in Convex. ADR 0008 replaces the original Solid application with the supported React integration.

Newsletter subscribers do not receive accounts. Future customer access may add magic links and other social providers without changing newsletter consent or using an external provider identifier as the platform's primary identity.

## Consequences

Workspace domain membership alone grants no role. Account creation, authentication, and future account linking must never imply newsletter consent.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
