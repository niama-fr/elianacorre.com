# Newsletter phase 1 plan

## Status

This plan is published by Linear issue [NIA-20](https://linear.app/niama/issue/NIA-20/publish-the-newsletter-phase-1-domain-model-and-architecture-plan) as the stable source of truth for later delivery issues. It is not an implementation authorization, and no production service has been configured.

## Outcome

A visitor can subscribe to Eliana Corré's approximately monthly French-language newsletter through double opt-in and, after confirming ownership of the email address, immediately receive a renewable personal link to the current free e-book.

The first phase establishes the identity, consent, email, content, and administrative boundaries needed by the future paid video subscription and lifetime-access training offers without implementing either paid offer.

## Scope

Phase 1 includes:

- reusable newsletter forms on the home page, site footer, and a dedicated page;
- required email and optional first name;
- immutable versions of the consent wording and privacy notice;
- 24-hour double-opt-in confirmation links;
- consent, withdrawal, source, and delivery-eligibility history in Convex;
- immediate e-book access after confirmation and a separate delivery email;
- renewable personal e-book links valid for 72 hours;
- Loops transactional email, campaigns, contacts, automations, and delivery webhooks;
- application-owned Loops task records executed durably by Convex Workflow, with retry backoff and transactional-send idempotency;
- production failure alerts and operator replay delivered by NIA-28;
- one-click unsubscription;
- bounce, complaint, and suppression handling;
- a minimal authenticated administration area;
- e-book version upload, preview, draft, and publication;
- subscriber lookup, export, rectification, unsubscription, and verified erasure operations;
- provider-independent CSV or JSON export;
- privacy, retention, audit, and non-production isolation procedures.

Phase 1 excludes:

- subscriber accounts;
- paid subscriptions, payments, or access-controlled videos;
- lifetime training purchases;
- parallel framework applications or migration prototypes;
- a newsletter editor in the website;
- contact-list import;
- multiple newsletter addresses per person;
- advertising attribution;
- general-purpose CMS capabilities.

## System responsibilities

### Application

The feature is delivered in the React TanStack Start application at `apps/web`.

### Convex

Convex is the source of truth for:

- people and canonical newsletter email addresses;
- pending subscription requests;
- consent periods and immutable legal text versions;
- subscription placement;
- delivery eligibility;
- suppression records;
- e-book versions and access rights;
- temporary confirmation and download capabilities;
- privacy requests and administrative audit events;
- durable Loops task intent and outcome, with Workflow owning execution and retry state;
- provider-independent exports.

External provider identifiers and normalized email addresses are lookup attributes, not primary identity keys.

### Loops

Loops provides:

- confirmation and e-book transactional emails;
- monthly campaign authoring, preview, test delivery, and scheduling;
- future lifecycle automations;
- operational delivery, bounce, complaint, and unsubscribe events.

Only confirmed contacts and necessary event properties are synchronized. Convex remains authoritative when states disagree.

### Better Auth

Better Auth with Convex authenticates administrators in phase 1:

- Google sign-in only;
- access limited to an explicit allowlist of Google Workspace addresses stored in Convex;
- Workspace domain membership alone grants no role;
- no newsletter subscriber receives an account.

The same identity foundation may later support verified customer accounts, magic links, and social providers.

### Google Workspace

Google Workspace provides:

- human reply mailboxes;
- `confidentialite@elianacorre.com` for privacy requests;
- collaborative newsletter and e-book source drafting in Google Docs or Drive;
- authorized Google identities for administrators.

Editable e-book sources remain in Drive. Publicly distributable versions are uploaded to Convex and never served through Drive links.

### Cloudflare

Cloudflare continues to host and protect the public application. Server-side validation and application rate limits are required; Cloudflare Turnstile is added only if observed abuse justifies it.

## Core flows

### Subscription

1. The visitor submits an email, optional first name, and known subscription placement.
2. The server trims the address and compares it case-insensitively without rewriting dots or `+tags`.
3. The public response never reveals whether the address is known.
4. A pending request records the current consent and privacy-notice versions.
5. Convex queues a Loops confirmation email containing a personal 24-hour token.
6. A newer request invalidates previous confirmation tokens.
7. Unconfirmed identifying data expires after 30 days.

Repeated requests are limited to three per email and three per IP address within 15 minutes, then may retry when capacity returns. A honeypot is used initially; Turnstile remains an escalation.

### Confirmation and e-book delivery

1. A valid confirmation creates a new consent period and delivery eligibility.
2. The current published e-book access right is granted.
3. The success page immediately exposes a personal 72-hour download.
4. Convex independently queues a Loops email containing a personal 72-hour link.
5. A subscriber may request a replacement link indefinitely while their identifying record and e-book right remain.
6. Each delivery records the e-book version supplied.

Loops failure does not roll back confirmation or access. Convex Workflow retries delivery asynchronously, and the success-page download remains available. The initial implementation makes three attempts with exponential backoff beginning at one second; NIA-28 must replace this baseline with the agreed production policy: confirmation email makes up to 12 attempts from a 30-second initial backoff over about 17 hours; e-book email makes up to 14 attempts from 30 seconds over about 68 hours; and contact synchronization makes up to 10 attempts from 60 seconds over about 8.5 hours. All use exponential base 2. Only network failures, HTTP 429, and HTTP 5xx retry. Permanent failures stop immediately, each task retains its Workflow ID, terminal failures alert an administrator, and replay reuses the original idempotency key.

### Repeated subscription

- Pending address: resend confirmation subject to rate limits.
- Active subscriber: return the neutral public response and queue a fresh e-book link.
- Former subscriber: require a new confirmation and create a new consent period.
- Suppressed address: return the neutral response but send nothing; suppression can be lifted only through a verified privacy request.
- Administrator: may resend confirmation but cannot manufacture confirmed consent.

### Unsubscription and delivery failure

- Unsubscription takes effect in one click without authentication.
- It ends newsletter consent but does not revoke existing e-book access.
- Permanent bounce or complaint makes the address ineligible independently of consent.
- A spam complaint requires a new explicit confirmation before eligibility can be restored.
- No re-engagement email is sent to a former subscriber.

### Future account linking

Creating or authenticating a future customer account never implies newsletter consent. An account can link to an existing subscriber only when the identity provider marks the matching email as verified or an additional verification succeeds.

## E-book management

- Exactly one e-book version is published at a time.
- Administrators can upload, preview, save as draft, and publish.
- Replacement links always deliver the current published version.
- Existing files and access history retain their version references.
- Download links are personal capabilities, expire after 72 hours, and can be renewed.
- A verified erasure request removes the person's e-book right.

The concrete delivery mechanism must account for the final file size. Convex HTTP responses are appropriate only within platform response-size limits; otherwise the implementation must use a storage path with equivalent temporary authorization.

## Privacy and retention

- Newsletter consent is separate from contact requests, authentication, purchases, and delivery eligibility.
- Contact-form submissions never imply newsletter subscription.
- Application Loops task outcomes and detailed provider operations are retained for 90 days; Workflow execution history follows the component's configured retention policy.
- Pending unconfirmed records are removed after 30 days.
- Former-subscriber identifying data and e-book access are retained for at most three years after unsubscription or last relevant contact, unless another active relationship establishes a separate legal basis.
- Expired former-subscriber records are anonymized without sending a reminder.
- Suppression records retain only the minimum value required to honor objections.
- Every consent references immutable versions of the wording and privacy notice shown.
- Open tracking is disabled.
- Limited click tracking is allowed only when transparently configured and disclosed.
- Operational delivery, bounce, complaint, and unsubscribe events remain available.

Privacy requests arrive at `confidentialite@elianacorre.com`. After identity verification, an administrator can separately inspect or export, rectify the optional first name, unsubscribe, restrict, object, or erase. Each administrative action is confirmed and audited; bulk deletion is excluded.

The manual identity-verification procedure is documented in [`docs/agents/privacy-request-identity-verification.md`](agents/privacy-request-identity-verification.md).

International transfers are not prohibited, but Convex, Loops, Cloudflare, Better Auth dependencies, and relevant subprocessors must be recorded with their contracts and transfer mechanisms in the project's privacy documentation and processing register.

## Email and domain operations

- Loops sends through `news.elianacorre.com`.
- Human replies go to a Google Workspace mailbox on `elianacorre.com`.
- SPF, DKIM, and DMARC must authorize both Workspace correspondence and Loops sending without creating conflicting DNS records.
- Every campaign identifies the sender, provides required legal identity or postal information, links to the privacy notice, offers visible one-click unsubscription, and provides a contact address.
- Campaigns are drafted and scheduled freely in Loops rather than promised for a fixed calendar date.
- Preview and test delivery are mandatory before a campaign is sent.
- No sponsored third-party content is included in phase 1.

## Environment isolation

Development and staging:

- never receive production subscriber data;
- never use production Loops credentials or contact identifiers;
- use a separate Loops environment or a local test adapter;
- may send manually only to an explicit allowlist of project Google Workspace addresses.

## Required human-reproducible operations

Before implementation is considered operationally complete, runbooks must document:

1. creating and rotating Loops, Better Auth, Convex, Google, and Cloudflare credentials;
2. configuring the sending subdomain, SPF, DKIM, DMARC, reply address, and webhooks;
3. uploading, previewing, publishing, replacing, and rolling back an e-book version;
4. drafting, testing, scheduling, and cancelling a Loops campaign;
5. diagnosing failed Loops tasks and their Workflow runs, then replaying them with the original idempotency key;
6. handling access, rectification, export, objection, unsubscription, suppression removal, and erasure requests;
7. exporting data before provider migration and reconciling Loops with Convex;
8. verifying environment isolation and recovering from accidental credential exposure;
9. updating legal text versions and the processing register when providers or purposes change.

Each runbook must name prerequisites, expected results, verification, recovery, rollback, security boundaries, and the equivalent manual action for any automation.

## Acceptance criteria

- A visitor can request subscription from every approved placement without account creation.
- Only a valid 24-hour confirmation activates consent and grants e-book access.
- Consent evidence includes timestamps, placement, and immutable legal-text versions.
- The confirmation page offers the current e-book immediately.
- The separate Loops email provides a renewable 72-hour personal link.
- Duplicate, former, suppressed, bounced, and complained addresses follow their defined flows without status disclosure.
- Unsubscription prevents subsequent campaigns and does not revoke e-book access.
- Confirmed state survives Loops downtime, and Workflow retries queued email without duplicating transactional delivery.
- Open tracking is disabled and allowed tracking is disclosed.
- Detailed operational records expire after 90 days; pending records expire after 30 days.
- Non-production cannot send to arbitrary real addresses or access production contacts.
- Only explicitly allowlisted Google identities can administer the system.
- Administrators can manage e-book publication and individual privacy operations without direct database access.
- Provider-independent export works without exposing active tokens or sensitive short-lived logs.
- A verified erasure removes identifying data and e-book access while preserving only legally justified minimal suppression data.
- Contact requests remain structurally and legally separate from newsletter consent.

## Implementation readiness

The functional and architectural plan is resolved. Before decomposition into Linear issues, the following external facts must be supplied or verified:

- final e-book format and file size;
- exact Google Workspace administrator addresses and reply mailbox;
- final legal identity and postal details for campaign footers;
- current Convex deployment region and whether migration is in scope;
- Loops plan limits and API capabilities at implementation time;
- final French consent, confirmation, unsubscription, privacy, and email copy;

These are implementation inputs rather than unresolved product behavior. No issue should be moved to Ready until its required inputs are available.

## Recorded decisions

- [Use Loops for email delivery](./adr/0001-use-loops-for-email-delivery.md)
- [Minimize newsletter tracking](./adr/0002-minimize-newsletter-tracking.md)
- [Isolate newsletter sending reputation](./adr/0003-isolate-newsletter-sending-domain.md)
- [Manage the published e-book in Convex](./adr/0004-manage-published-ebook-in-convex.md)
- [Use Better Auth for platform identities](./adr/0005-use-better-auth-for-platform-identities.md)
- [Isolate non-production email](./adr/0006-isolate-non-production-email.md)
- [Decouple email delivery from domain state](./adr/0007-decouple-email-delivery-from-domain-state.md)
