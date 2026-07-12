# Welcome e-book recovery

## Outcome

An eligible person can request a fresh personal Welcome E-book download link without changing Newsletter Consent or creating an Account. The public response remains neutral for every address.

## Prerequisites

- The public application and Convex deployment are available.
- A current published e-book exists in Convex.
- The deployment has its Loops transactional-email configuration and capability-signing secret. Keep those values only in the deployment environment.
- Test email delivery only in the isolated non-production environment and to an allowlisted address.

## Canonical systems

- Linear records delivery work and acceptance evidence.
- Convex owns Profiles, Newsletter Consent, Welcome E-book Access, capabilities, issuance history, and Loops task state.
- Loops sends the transactional email but is not authoritative.
- Git contains the recovery form, eligibility rules, and French copy.

## Manual procedure

1. Open `/newsletter/recuperer-ebook` in the target environment.
2. Submit the email address without using the newsletter subscription form.
3. Confirm the same neutral acknowledgement appears whether the address is eligible, unknown, suppressed, erased, or expired.
4. For an eligible active or ordinary Former Newsletter Subscriber, open the delivered email and use its personal link within 72 hours.
5. In Convex, verify that a replacement `ebookIssuance` records the current published e-book version and that one `sendEbookEmail` Loops task was queued. Verify Newsletter Consent did not change.
6. To test a publication rollback, publish another version, request a link, then republish the earlier version and request another link. Each new issuance must reference the version that was current at its request time.

## Expected results and verification

- The public response never discloses eligibility.
- Active and retained Former Newsletter Subscribers receive a new 72-hour link; ineligible people receive no email.
- Capabilities are signed bearer links and can be downloaded repeatedly until their individual expiry. A replacement creates another independent 72-hour capability.
- Run the focused backend coverage from the repository root:

  ```bash
  rtk test bun run --cwd packages/backend test -- convex/newsletter.test.ts
  ```

## Recovery and rollback

- If a request does not result in an email, inspect the matching Convex `loopsTasks` record and its Workflow execution. Replay only the failed task with its original idempotency key; do not create consent or manually issue an unsigned link.
- If a wrong e-book version was published, republish the intended archived version. New recovery requests use it; existing issuance history remains unchanged.
- To roll back this feature, revert its pull request. Do not delete issuance history or capabilities as part of a code rollback.

## Security boundaries

- Never paste Loops keys, transactional IDs, or the capability-signing secret into Linear, Git, or support messages.
- Do not reveal whether an address has access, is suppressed, erased, or expired.
- Do not send a link manually from a personal mailbox or create a permanent file URL.

## Automation mapping and maintenance

The application automates the neutral eligibility decision, capability signing, issuance history, and durable Loops task creation. The equivalent human action is the manual procedure above, followed by Convex and Loops inspection.

Update this runbook when recovery eligibility, retention, capability reuse, transactional templates, Loops task handling, or the public route changes. NIA-26 owns the verified privacy-operation interface; NIA-27 owns scheduled retention cleanup.
