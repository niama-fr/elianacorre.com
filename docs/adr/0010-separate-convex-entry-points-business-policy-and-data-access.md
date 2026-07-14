# Separate Convex entry points, business policy, and data access

## Status

Accepted

## Context

Newsletter, e-book, profile, and Loops behavior had accumulated in public Convex function files and repository-root helpers. Authorization, public validation, business policy, persistence queries, and provider orchestration were difficult to distinguish. NIA-25 adds retention-sensitive recovery rules whose policy must remain independently reviewable without exposing persistence details to web callers.

## Decision

Organize the backend into three explicit layers:

- `convex/` owns public, internal, HTTP, and scheduled entry points, including validation and authorization boundaries;
- `business/` owns application policy and orchestration, including newsletter lifecycles, e-book access, and Loops delivery intent;
- `data/` owns focused Convex table reads and writes.

Public callers continue to use generated Convex APIs. Business modules may compose data modules, while data modules do not import business modules or public entry points. This is an organizational boundary inside the existing backend package, not a new deployable service or generic repository abstraction.

## Consequences

Policy can be reviewed and tested separately from query mechanics, entry points remain thin, and table indexes stay close to their persistence functions. The additional directories increase navigation cost, so modules keep domain names and avoid barrel exports. Changes that cross the layers must preserve Convex authorization at the entry point and business invariants in the business layer.

## References

- [NIA-25](https://linear.app/niama/issue/NIA-25/provide-renewable-versioned-welcome-e-book-delivery)
