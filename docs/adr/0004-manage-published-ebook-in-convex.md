# Manage the published e-book in Convex

## Status

Accepted for newsletter phase 1.

## Context

The free e-book is drafted collaboratively, but subscriber access needs stable publication state, temporary authorization, and delivery history.
Personal Drive links are not an acceptable production delivery mechanism.

## Decision

Keep editable e-book source files in the project's Google Drive. Upload and administer distributable versions in Convex with draft and
published states and exactly one current published version. Convex records the delivered version and provides or authorizes subscriber
downloads.

## Consequences

Delivery issues must preserve version references for existing files and access history. The concrete download mechanism must account for the
final file size: Convex HTTP responses are acceptable only within platform response-size limits; otherwise use a storage path with equivalent
temporary authorization.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
