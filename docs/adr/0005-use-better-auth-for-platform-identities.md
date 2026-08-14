# Use Better Auth for platform identities

## Status

Accepted. Updated for the current member social-authentication scope on 2026-08-14. The Solid-specific framework decision is superseded by [ADR 0008](0008-replace-solid-with-react.md), and [ADR 0012](0012-separate-public-and-authenticated-applications.md) owns the authenticated application's deployment location.

## Context

Phase 1 needs authenticated content administrators, and paid Travel Packs need member authentication without making newsletter subscription, provider email, or a social-provider account the durable ownership identity. Routine magic-link delivery would couple authentication availability to email delivery, while email/password credentials would add an unnecessary credential lifecycle.

## Decision

Use Better Auth with Convex as the Authentication Provider adapter. Google remains the administrator provider, and Google, Facebook/Meta, and Twitter/X are the current member providers. Routine login uses social authentication, not magic links, authentication email, or email/password credentials. Apple is deferred until its developer configuration and end-to-end provider behavior can be verified under [NIA-72](https://linear.app/niama/issue/NIA-72/add-apple-social-authentication-for-members).

Better Auth owns its User, provider Account, credential, and session records. The application links one Better Auth User to one canonical Profile; a new User authenticated through the member surface provisions a `member` Profile even before it owns an entitlement. Provider accounts remain distinct inside Better Auth. Implicit same-email account linking is disabled: Better Auth does not merge independently authenticated Accounts based on an email match, and apparently related or different emails never merge Profiles. A future explicit link or purchase-claim flow must prove control while already authenticated or through a separately specified one-time verification flow.

A valid Better Auth session plus an established application Identity-to-Profile association is sufficient for generic authenticated Profile resolution. Provider email verification is a separate assertion for operations that explicitly require proof of email ownership; it is not a prerequisite for social authentication and is not synthesized when a provider does not supply it.

The Profile identifier—not provider subject, provider email, hidden address, or billing email—owns roles, purchases, memberships, and entitlements. Email remains optional, mutable contact and verification data. A social Account may therefore link to a Profile without a contact email. Newsletter subscribers do not receive Accounts, and Account creation or linking never changes newsletter consent.

## Consequences

Workspace domain membership alone grants no role. Hidden, absent, and changing provider email create no ownership transfer. Checkout and fulfillment must carry stable Profile correlation and fail closed rather than reconcile by email. The application must provide an intentional authenticated linking experience before one Profile can use multiple independently created Better Auth Users; that experience is outside the initial provider-foundation ticket.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
- [NIA-44](https://linear.app/niama/issue/NIA-44/split-public-and-authenticated-tanstack-applications)
- [NIA-51](https://linear.app/niama/issue/NIA-51/establish-three-provider-social-authentication-for-members)
