# Isolate newsletter sending reputation

## Status

Accepted for newsletter phase 1.

## Context

Newsletter and lifecycle email need authenticated sending without risking the reputation of ordinary human correspondence. Replies should
still reach a normal project mailbox rather than creating a separate support workflow.

## Decision

Send newsletter and lifecycle email through Loops from the dedicated `news.elianacorre.com` subdomain. Direct human replies to a Google
Workspace mailbox on `elianacorre.com`.

## Consequences

DNS work must authorize both Google Workspace and Loops without conflicting SPF, DKIM, or DMARC records. Operational runbooks must verify the
sending subdomain, reply address, and webhook configuration before production use.

## Links

- [Newsletter phase 1 plan](../newsletter-phase-1-plan.md)
- [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan)
