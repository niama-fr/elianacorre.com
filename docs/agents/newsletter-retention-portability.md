# Newsletter retention and portability

## Outcome

The application removes or anonymizes newsletter data at the approved 30-day, 90-day, and three-year boundaries and lets an authenticated administrator download provider-independent JSON or CSV before changing email providers.

## Prerequisites and canonical systems

- Work from the repository root with Bun 1.3.10, RTK, and an authenticated Convex development deployment.
- Use a verified Better Auth identity whose linked profile has the `admin` role.
- Linear owns the delivery issue and policy acceptance criteria. Convex owns subscriber and retention-run data. Git owns this runbook and the application code. Loops remains only the delivery provider.
- Obtain Grégory's explicit approval before running retention manually against production or deleting production data outside the scheduled job.

## Automated schedule and expected result

Convex runs `privacy.startRetention` daily at 02:00 UTC. It starts the existing Convex Workflow component, which durably sequences the four phases. Each workflow step calls one transactional mutation; technical phases process at most 100 records, while profile cleanup processes one profile with at most 20 records per child relationship. Convex automatically retries transactional system and optimistic-concurrency failures. Application errors fail the workflow attempt and are retried only through the recovery procedure below. Application-owned `retentionRuns` records the component workflow ID, attempt status, completion time, failed phase, and cumulative business counters; Workflow owns execution history and step sequencing.

The phases use these inclusive boundaries:

1. Completed Loops task details use `finishedAt` and provider webhook details use `occurredAt`; both expire at 90 days.
2. Download-attempt rows expire at 90 days unless a pending delivery task still needs the row.
3. A never-confirmed newsletter profile is anonymized at 30 days. Its active confirmation capability and associated delivery task are removed; restrictions and delivery evidence remain linked to the anonymous profile.
4. A former subscriber is anonymized three years after the last unsubscription or relevant request unless an identity or contact request supplies another active basis. Welcome e-book access and its dependent delivery work are removed together.
5. Suppression rows retain only an HMAC value and are not joined to campaign export fields.

No retention phase starts a Loops delivery workflow or sends a re-engagement email.

## Administrative export

1. Start the local application with `rtk proxy bun run dev`, or open the authenticated administration area for the intended deployment.
2. Confirm the deployment name printed by Convex before continuing. Never use production merely to obtain test data.
3. Open `/admin/privacy` and locate **Portabilité globale de la newsletter**.
4. Select **Télécharger JSON** or **Télécharger CSV**.
5. Store the file only in the approved migration workspace and delete temporary copies when the migration or audit ends.

The result contains people, consent periods, delivery eligibility, e-book access, and standalone suppression state. It excludes capability tokens, request IP addresses, provider task errors and identifiers, webhook details, and download-attempt logs. JSON and CSV represent the same business state; CSV distinguishes `person` and `suppression` rows with `recordType`.

## Verification

From the repository root, run:

```bash
rtk test bun run --cwd packages/backend test -- convex/retention.test.ts convex/privacy.test.ts
rtk proxy bun run typecheck
rtk proxy bun run check
rtk proxy bun run build
rtk git diff --check
```

In `/admin/privacy`, confirm an export downloads in both formats and **Dernières exécutions de rétention** shows the latest run as `Terminée` with plausible counters. Seed synthetic records immediately before and exactly at every boundary; never use a real subscriber for a destructive test.

## Recovery and rollback

- A run marked `Interrompue` names the failed application phase. Inspect the linked workflow ID and invocation in **Convex Dashboard → Logs**, correct the cause, then open **Functions**, select `privacy:startRetention`, enter `{}`, and select **Run function**. A retry creates a new `retentionRuns` attempt with counters starting at zero and safely traverses the bounded phases again; already-applied operations are idempotent. If an application record says `En cours` but Workflow reports `failed` or `canceled`, `startRetention` reconciles the old attempt to `Interrompue` before creating the new attempt. An actually in-progress workflow is returned without overlap. The expected result is a new attempt changing from `En cours` to `Terminée` in `/admin/privacy`. Running this against production requires Grégory's explicit approval.
- If an export fails, keep the source data unchanged, inspect the browser and Convex logs, and retry. Do not fall back to copying Convex tables or Loops contacts manually.
- Anonymization and deletion are intentionally irreversible, and this repository does not currently document or guarantee a data-restore path. Stop the cron through an approved incident change and contact the Convex project owner if recovery may be possible from an externally configured backup. Do not recreate consent or e-book capabilities from a technical log.
- Roll back faulty code through the normal pull-request workflow. Disabling the cron requires a dedicated Ready Linear issue unless stopping an active incident is explicitly approved.

## Security boundaries

Keep `SUPPRESSION_HASH_SECRET`, capability secrets, provider credentials, exports, and production data out of Git, Linear comments, chat, and test fixtures. An export is personal data even though active capabilities and technical logs are excluded. Suppression hashes honor objections only and must never become marketing identifiers.

## Automation mapping and maintenance

The daily Convex cron and Workflow component replace manually locating due records, sequencing the four retention phases, surfacing failed application steps for operator-triggered retry, recording counters, and repeating bounded pages. The equivalent human observation is the retention-run list in `/admin/privacy`; destructive manual execution still requires explicit approval. The two download buttons replace a direct database extraction and call the same authenticated Convex query used by the application.

Grégory owns this runbook. Update it whenever policy boundaries, batch size, run evidence, export columns, administrator authorization, provider data, recovery steps, or the Convex schedule changes.

## Boundary fixtures without production data

The reproducible seeding path is the isolated Convex test harness; it creates synthetic profiles, tasks, webhooks, downloads, e-book access, and suppression rows in memory. Run each named scenario from the repository root:

```bash
rtk test bun run --cwd packages/backend test -- convex/retention.test.ts -t "30 days"
rtk test bun run --cwd packages/backend test -- convex/retention.test.ts -t "three-year"
rtk test bun run --cwd packages/backend test -- convex/retention.test.ts -t "90-day"
rtk test bun run --cwd packages/backend test -- convex/retention.test.ts -t "portability"
rtk test bun run --cwd packages/backend test -- convex/retention.test.ts -t "observable run"
```

Each command must report one passing test. The fixtures place one record exactly at the inclusive boundary and another one millisecond before it; the assertions prove the due record changed and the not-yet-due record remained. Do not reproduce these destructive scenarios in staging or production with real subscriber data.
