# Use Better Auth for platform identities

## Status

Accepted. Updated for the current member social-authentication scope on 2026-08-14. The Solid-specific framework decision is superseded by [ADR 0008](0008-replace-solid-with-react.md), and [ADR 0012](0012-separate-public-and-authenticated-applications.md) owns the authenticated application's deployment location.

## Context

Phase 1 needs authenticated content administrators, and paid Travel Packs need member authentication without making newsletter subscription, provider email, or a social-provider account the durable ownership identity. Routine magic-link delivery would couple authentication availability to email delivery, while email/password credentials would add an unnecessary credential lifecycle.

## Decision

Use Better Auth with Convex as the Authentication Provider adapter. Google, Facebook/Meta, and Twitter/X are the current authentication mechanisms. Administrators are authorized by their canonical Profile role rather than by a special provider. Routine login uses social authentication, not magic links, authentication email, or email/password credentials. Apple is deferred until its developer configuration and end-to-end provider behavior can be verified under [NIA-72](https://linear.app/niama/issue/NIA-72/add-apple-social-authentication-for-members).

Better Auth owns its User, provider Account, credential, session, and supported provider-account linking behavior. It may attach multiple provider Accounts to one Better Auth User. The application synchronizes only Better Auth User creation: each new User receives one application Identity and resolves to one canonical Profile. Adding another provider Account to an existing User creates no application Identity or Profile and changes no ownership.

A new User normally provisions an email-independent `member` Profile even before it owns an entitlement. As a provider-independent administrator bootstrap exception, a new User whose canonical email matches an explicitly pre-provisioned `admin` Profile is associated with that Profile, provided it has no existing Better Auth Identity. Ordinary `contact` and `member` Profiles are never claimed by matching authentication email. The application does not merge independently created Better Auth Users or Profiles from matching, apparently related, different, hidden, absent, changing, or placeholder provider email. Any future explicit User-linking or purchase-claim flow requires separately specified proof.

A valid Better Auth session plus an established application Identity-to-Profile association is sufficient for generic authenticated Profile resolution. Provider email verification is a separate assertion for operations that explicitly require proof of email ownership; it is not a prerequisite for social authentication and is not synthesized when a provider does not supply it.

The Profile identifier—not provider subject, provider email, hidden address, or billing email—owns roles, purchases, memberships, and entitlements. Email remains optional, mutable contact and verification data. A social Account may therefore link to a Profile without a contact email. Newsletter subscribers do not receive Accounts, and Account creation or linking never changes newsletter consent.

## Consequences

Provider choice and Workspace domain membership alone grant no role. Hidden, absent, and changing provider email create no ownership transfer. Checkout and fulfillment must carry stable Profile correlation and fail closed rather than reconcile by email. Better Auth provider-account linking is distinct from application-level Profile merging. Intentionally linking independently created Better Auth Users, if ever needed, requires a separate feature.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
- [NIA-44](https://linear.app/niama/issue/NIA-44/split-public-and-authenticated-tanstack-applications)
- [NIA-51](https://linear.app/niama/issue/NIA-51/establish-three-provider-social-authentication-for-members)
