# Use Better Auth for platform identities

## Status

Accepted for newsletter phase 1.

## Context

Phase 1 needs authenticated content administrators, and later paid subscriptions and training purchases need customer identities. The stable
application is `apps/solid`, so the identity provider must fit TanStack Start, Solid, and Convex without making newsletter subscription an
account concept.

## Decision

Use Better Auth with Convex for administrative and future customer identities because it supports TanStack Start, provides a Solid client, and
integrates with Convex without adapting a React-specific SDK. Phase 1 enables Google sign-in only for explicitly authorized content
administrators stored in Convex.

Newsletter subscribers do not receive accounts. Future customer access may add magic links and other social providers without changing
newsletter consent or using an external provider identifier as the platform's primary identity.

## Consequences

Workspace domain membership alone grants no role. Account creation, authentication, and future account linking must never imply newsletter
consent.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
