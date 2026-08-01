# Render published legal Markdown dynamically

## Status

Accepted

## Context

The privacy-policy route must render the active published Convex privacy notice without duplicating legal copy in the web application. Legal-copy changes should remain fresh without requiring a site deployment, while the resulting document must be crawlable, semantic, and safe to render.

## Decision

Store privacy-notice content as CommonMark Markdown and fetch the active published privacy notice once, through a TanStack Start server function, in the public layout loader. The server function owns the Convex HTTP client and environment access; public routes receive the result as ordinary loader data and do not import Convex React Query. The privacy route reuses its parent layout's notice rather than issuing another query. The invariant newsletter-consent sentence is repository-owned website copy rather than a published legal-text version. Raw HTML is outside the supported contract. The web renderer permits only HTTP, HTTPS, mail, telephone, root-relative, and fragment links, and shifts Markdown headings below the route’s page heading.

The existing plain-text privacy records require no content backfill because plain text is valid CommonMark. Running the Convex seed after deployment creates and publishes a new privacy-notice version when the canonical Markdown content differs. New newsletter consent evidence stores the exact published privacy-notice ID presented with the form. Historical bundle and newsletter-consent records remain immutable and readable during the migration.

Route loading fails through the application error path when Convex is unavailable or the active privacy notice is missing. Empty legal Markdown also fails explicitly. The route does not silently serve duplicated, empty, or indefinitely stale policy text.

## Consequences

Published changes can become visible without rebuilding the web application, and crawlers receive rendered HTML. The privacy notice crosses a server-only application boundary and is not added to the browser's reactive Convex dependency graph. Page availability depends on Convex and the active privacy notice. Markdown features remain intentionally constrained; adding raw HTML or broader URL handling requires a new security review.

## Publication runbook

### Outcome and prerequisites

The procedure publishes repository-approved privacy Markdown as a new immutable Convex record. The operator needs repository access, permission to view the target Convex deployment, and—only for production—permission to dispatch and approve the protected production workflow. The legal-copy change must be reviewed and merged first. Git and Bun must be installed; `bun install` installs the Convex CLI dependency.

### Canonical systems and security

Linear owns the delivery task, Git owns approved legal copy and this decision, Convex owns published privacy-notice versions, and GitHub Actions owns deployment evidence. Secrets stay in GitHub environments, ignored local environment files, or the Convex dashboard; never paste their values into Git, Linear, Obsidian, command arguments, or Markdown.

### Manual procedure and expected results

1. From the repository root, run `git pull --ff-only origin main` and confirm the legal-copy commit is present with `git log -1 --oneline`. The checkout must be clean and current.
2. For staging, open GitHub **Actions → Deploy staging**, select the workflow run for that merge, and wait for its `bunx convex run seed:init` step to succeed. A changed canonical notice creates one published `privacyNotice` record; unchanged content creates none.
3. For a local development deployment only, run `cd packages/backend` followed by `bunx convex run seed:init`. The selected Convex deployment comes from the existing local Convex configuration.
4. For production, follow the protected SemVer promotion procedure in [`docs/agents/deployment.md`](../agents/deployment.md). The approved workflow runs the same `seed:init` mutation; do not run it manually against production.

### Verification

In the target Convex dashboard, inspect **Data → legalTexts** and confirm the latest published `privacyNotice.content` matches the repository constant. Confirm the seed did not create a `newsletterConsent` legal text or `newsletterLegalBundles` record. Then load `/confidentialite`, view the server response or page source, and confirm the privacy title, headings, lists, emphasis, mail link, and CNIL link are present. `/mentions-legales` must remain distinct.

### Recovery and rollback

If the seed fails, the previous active privacy notice remains authoritative: correct the code and rerun the workflow. If incorrect content becomes active, restore the last approved content in a new issue and pull request, then deploy normally; the idempotent seed publishes that content as a new version. Use the protected rollback workflow from `docs/agents/deployment.md` only when the application deployment itself must also be reverted. Never delete or edit historical production legal records.

### Automation mapping and maintenance

GitHub’s staging and production workflows automate the manual Convex deploy, `bunx convex run seed:init`, web build, and Worker deployment steps. Grégory owns legal-copy approval, protected production approval, and visual/content validation. Update this ADR and the deployment runbook whenever the content format, seed mutation, workflow names, verification fields, or recovery path changes.

## Subscription evidence migration runbook

### Outcome and prerequisites

This one-time expand–migrate–contract process adds `privacyNoticeId` to historical subscriptions without rewriting or deleting their existing `legalBundleId`, bundle, or legal-text evidence. The operator needs the NIA-48 compatible schema and migration code, Bun and Git, dashboard access to the personal development, staging, and production Convex deployments, and a deployment-scoped key for each non-development target.

### Manual procedure and expected results

1. Confirm the checkout contains the compatible schema: both subscription references are optional, new writes use `privacyNoticeId`, and legacy requests remain accepted. Run the complete verification commands in [`docs/agents/verification.md`](../agents/verification.md).
2. Deploy the compatible release through the environment’s canonical path: `bunx convex dev` for the personal development deployment, the successful merge-to-`main` workflow for staging, and the protected SemVer production promotion in [`docs/agents/deployment.md`](../agents/deployment.md) for production. Confirm the expected commit and Convex deployment in GitHub and the Convex dashboard before continuing; do not deploy production Convex code independently from its release.
3. In that deployment’s Convex dashboard function runner, select `migrations:backfillSubscriptionPrivacyNoticeIds` and run `{"dryRun":true}`. Expect one batch to complete without a persisted data change.
4. Run the same function with `{}`. Monitor the Migrations component status until it reports completion. An interrupted run is resumed by invoking the same function again.
5. Under **Data → newsSubscriptions**, verify every subscription has `privacyNoticeId`. For a sample of legacy rows, follow `legalBundleId` to `newsletterLegalBundles.privacyNoticeId` and confirm it equals the new field. Repeat the deploy, dry run, execution, and verification separately for development, staging, and production.
6. Deploy the compatible website and backend release. Rerun the idempotent migration afterward to catch subscriptions created during the rollout, then repeat the zero-missing and sample-equivalence checks before beginning the contract release.

### Recovery, security, automation, and maintenance

If a row has no legacy bundle, a missing bundle, a wrong-kind privacy record, or a privacy notice published after the request, the migration fails without patching that row. Preserve the widened schema, investigate the historical evidence, correct migration code through NIA-48, redeploy, and resume; never synthesize, delete, or rewrite historical consent evidence. Before the contract release, application rollback may continue reading legacy bundles. After new evidence exists, do not roll the schema back to a version that rejects `privacyNoticeId`.

Deploy keys remain only in approved secret stores and should grant only the required deployment permissions. The dashboard invocation is the human equivalent of `bunx convex run migrations:backfillSubscriptionPrivacyNoticeIds`; production execution and any destructive contract step require Grégory’s explicit approval. Grégory records completion evidence on NIA-48 and owns this runbook until the contract release removes the migration function. Update it if the function name, arguments, deployment topology, verification fields, or recovery behavior changes.

## References

- [NIA-37](https://linear.app/niama/issue/NIA-37/render-the-convex-privacy-notice-as-markdown-at-confidentialite)
