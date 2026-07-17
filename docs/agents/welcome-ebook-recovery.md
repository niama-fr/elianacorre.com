# Welcome e-book recovery

## Outcome

An eligible person can request a fresh personal Welcome E-book download link without changing Newsletter Consent or creating an Account. The public response remains neutral for every address.

## Prerequisites

- Bun 1.3.10 and the repository checked out at the commit being verified.
- Access to the Niama Linear workspace, the appropriate Convex project and deployment, and the Loops account used by that deployment.
- Convex deployment permission to inspect tables, files, functions, and Workflow runs. Production writes require explicit Grégory approval.
- Loops permission to inspect transactional sends. Do not use a production recipient for testing.
- The public application and matching Convex deployment are available.
- A current published e-book exists in Convex.
- The deployment has its Loops transactional-email configuration and capability-signing secret. Keep those values only in the deployment environment.
- Test email delivery only in the isolated non-production environment and to an allowlisted address.

From the repository root, identify the canonical environments in `docs/agents/project-resources.md`. Use `eliana-corre:elianacorre-com-staging` for manual delivery tests; `eliana-corre:elianacorre-com-b1869` is production and requires explicit approval for writes. Then select the backend package and inspect the configured non-production deployment and public URL:

```bash
cd packages/backend
rtk proxy bunx convex dashboard
rtk proxy bunx convex env get SITE_URL
```

The dashboard command opens the deployment selected by the package's local Convex configuration. Confirm its project and deployment name before inspecting data. `SITE_URL` is the public application base URL for that deployment; append `/newsletter/ebook`. If the command has no configured deployment, return to the repository root with `cd ../..`, run `rtk proxy bun run dev`, and follow the printed Convex authorization prompt. Never switch these commands to production merely to obtain test data.

## Canonical systems

- Linear records delivery work and acceptance evidence.
- Convex owns Profiles, Newsletter Consent, Welcome E-book Access, capabilities, issuance history, and Loops task state.
- Loops sends the transactional email but is not authoritative.
- Git contains the recovery form, eligibility rules, and French copy.

## Manual procedure

1. Open `<SITE_URL>/newsletter/ebook` without a token, or open an expired or otherwise invalid personal e-book link. Discover `<SITE_URL>` with the prerequisite command above.
2. Select **Recevoir un nouveau lien** to open the recovery dialog, then submit the email address without using the newsletter subscription form.
3. Confirm the same neutral acknowledgement appears whether the address is eligible, unknown, suppressed, erased, or expired.
4. For an eligible active or ordinary Former Newsletter Subscriber, open the delivered email and use its personal link within 72 hours.
5. In the Convex dashboard, select the matching project and deployment, open **Data**, and find the Profile by its canonical email. Copy its `_id` only inside the dashboard.
6. Filter `ebookIssuances` by that `profileId`. The newest row must have `kind: "replacement"` and reference the currently published `ebookId`.
7. Open `loopsTasks`, filter by the same `profileId`, and find the newest `sendEbookEmail` row. Record its `_id`, current Workflow identifier (`workflowIds[0]`), `idempotencyKey`, and status without copying recipient data into Linear or Git.
8. Open the Convex Workflow component view and locate the run by `workflowIds[0]`. A healthy run succeeds and changes the task from `pending` to `succeeded`.
9. In Loops, open **Transactional → Logs**, find the allowlisted recipient and matching time, and verify one successful send. The Loops log does not replace the Convex task record as evidence.
10. Return to Convex and verify that the current `newsSubscriptions` row was neither created nor changed by recovery.
11. To test a publication rollback, publish another version, request a link, then republish the earlier version and request another link. Each new issuance must reference the version that was current at its request time.

## Expected results and verification

- The public response never discloses eligibility.
- Active and retained Former Newsletter Subscribers receive a new 72-hour link; ineligible people receive no email.
- Capabilities are signed bearer links and can be downloaded repeatedly until their individual expiry. A replacement creates another independent 72-hour capability.
- An invalid, expired, erased-profile, or missing-file capability returns to `/newsletter/ebook` without retaining the bearer token and exposes the same recovery dialog.
- Run the focused backend coverage from the repository root:

  ```bash
  rtk test bun run --cwd packages/backend test -- convex/newsletter.test.ts
  ```

## Recovery and rollback

- If a request does not result in an email, inspect the matching Convex `loopsTasks` record and its Workflow execution using steps 5–9. Save only task and Workflow identifiers in the incident record.
- NIA-25 does not expose an operator replay command. NIA-28 owns replay that retains the original business idempotency key and derives a replay-specific delivery key. Until that work ships, an eligible person may submit the neutral recovery dialog again after the rate-limit window; do not mutate a failed task, invoke internal functions from a production shell, create consent, or manually issue an unsigned link.
- If inspection was interrupted, reopen the same deployment and resume from the saved task or Workflow ID. Read-only inspection is safe to repeat.
- If a wrong e-book version was published, republish the intended archived version. New recovery requests use it; existing issuance history remains unchanged.
- To roll back this feature, revert its pull request. Do not delete issuance history or capabilities as part of a code rollback.

## Security boundaries

- Never paste Loops keys, transactional IDs, or the capability-signing secret into Linear, Git, or support messages.
- Do not reveal whether an address has access, is suppressed, erased, or expired.
- Do not send a link manually from a personal mailbox or create a permanent file URL.

## Automation mapping and maintenance

The application automates the neutral eligibility decision, capability signing, issuance history, and durable Loops task creation. The equivalent manual action is submitting the public dialog and performing the Convex and Loops inspections above; humans must never reproduce signing or eligibility decisions by editing production data.

Grégory owns this runbook. Update it when recovery eligibility, retention, capability reuse, transactional templates, Loops task handling, deployment navigation, or the invalid-link dialog entry point changes. NIA-26 owns the verified privacy-operation interface; NIA-27 owns scheduled retention cleanup; NIA-28 owns alerts and operator replay.
