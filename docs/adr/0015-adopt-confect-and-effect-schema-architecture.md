# Adopt Confect and Effect Schema architecture

## Status

Accepted. Supersedes [ADR 0014](0014-adopt-effect-schema-through-effex-confect-primitives.md) after completion of NIA-74.

## Decision

Effect Schema is the canonical representation for first-party domain, persistence, and transport contracts. Schema constants use the `s` prefix. Localized validation copy stays in the applications; domain schemas expose stable semantic identifiers when callers need to distinguish issues. Standard Schema conversion happens only at consumers such as TanStack form, router, or server-function validators.

The backend uses Confect tables, Specs, implementations, services, typed Refs, and generated registrations. Expected business and state failures remain in the Effect error channel and are declared by the corresponding Spec. Defects are reserved for configuration failures and programmer invariants. Native Convex validators and references remain at component, workflow, HTTP, and provider boundaries where Confect does not own the contract.

Persisted `Fields`, `Doc`, `Dto`, `Entity`, and related application terminology remain as defined in the schema architecture guide. Patch contracts list writable fields or state transitions explicitly when a broad partial would permit illegal writes. Optional fields that must be cleared represent `undefined` explicitly at the patch boundary.

Confect prerelease packages are pinned to one exact version. Effect prereleases are pinned to a version compatible with that Confect release. The root codegen command regenerates Confect output before Convex bindings, generated files are committed, and pull-request CI rejects drift. Generated files are never edited manually.
