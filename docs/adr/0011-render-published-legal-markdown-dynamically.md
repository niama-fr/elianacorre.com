# Render published legal Markdown dynamically

## Status

Accepted

## Context

The privacy-policy route must render the active published Convex privacy notice without duplicating legal copy in the web application. Legal-copy changes should remain fresh without requiring a site deployment, while the resulting document must be crawlable, semantic, and safe to render.

## Decision

Store legal-text content as CommonMark Markdown and fetch the active Newsletter Legal Bundle once, through a TanStack Start server function, in the public layout loader. The server function owns the Convex HTTP client and environment access; public routes receive the result as ordinary loader data and do not import Convex React Query. The privacy route reuses its parent layout's bundle rather than issuing another query. Raw HTML is outside the supported contract. The web renderer permits only HTTP, HTTPS, mail, telephone, root-relative, and fragment links, and shifts Markdown headings below the route’s page heading.

The existing plain-text records require no schema backfill because plain text is valid CommonMark. Running the existing Convex seed after deployment creates and publishes a new version when the canonical Markdown content differs, then atomically activates a bundle that references it.

Route loading fails through the application error path when Convex is unavailable or the active bundle is missing. Empty legal Markdown also fails explicitly. The route does not silently serve duplicated, empty, or indefinitely stale policy text.

## Consequences

Published changes can become visible without rebuilding the web application, and crawlers receive rendered HTML. The bundle crosses a server-only application boundary and is not added to the browser's reactive Convex dependency graph. Page availability depends on Convex and the active legal bundle. Markdown features remain intentionally constrained; adding raw HTML or broader URL handling requires a new security review.

## Publication runbook

### Outcome and prerequisites

The procedure publishes repository-approved legal Markdown as a new immutable Convex record and activates it atomically. The operator needs repository access, permission to view the target Convex deployment, and—only for production—permission to dispatch and approve the protected production workflow. The legal-copy change must be reviewed and merged first. Git and Bun must be installed; `bun install` installs the Convex CLI dependency.

### Canonical systems and security

Linear owns the delivery task, Git owns approved legal copy and this decision, Convex owns published versions and the active bundle, and GitHub Actions owns deployment evidence. Secrets stay in GitHub environments or the Convex dashboard; never paste them into Git, Linear, Obsidian, commands, or Markdown.

### Manual procedure and expected results

1. From the repository root, run `git pull --ff-only origin main` and confirm the legal-copy commit is present with `git log -1 --oneline`. The checkout must be clean and current.
2. For staging, open GitHub **Actions → Deploy staging**, select the workflow run for that merge, and wait for its `bunx convex run seed:init` step to succeed. A changed canonical notice creates a `privacyNotice` record and an active `newsletterLegalBundles` record; unchanged content creates neither.
3. For a local development deployment only, run `cd packages/backend` followed by `bunx convex run seed:init`. The selected Convex deployment comes from the existing local Convex configuration.
4. For production, follow the protected SemVer promotion procedure in [`docs/agents/deployment.md`](../agents/deployment.md). The approved workflow runs the same `seed:init` mutation; do not run it manually against production.

### Verification

In the target Convex dashboard, inspect **Data → legalTexts** and confirm the latest published `privacyNotice.content` matches the repository constant. Inspect **Data → newsletterLegalBundles** and confirm the newest published bundle references that record. Then load `/confidentialite`, view the server response or page source, and confirm the privacy title, headings, lists, emphasis, mail link, and CNIL link are present. `/mentions-legales` must remain distinct.

### Recovery and rollback

If the seed fails before inserting the bundle, the previous active bundle remains authoritative: correct the code and rerun the workflow. If incorrect content becomes active, restore the last approved content in a new issue and pull request, then deploy normally; the idempotent seed publishes that content as a new version and activates a new bundle. Use the protected rollback workflow from `docs/agents/deployment.md` only when the application deployment itself must also be reverted. Never delete or edit historical production legal records.

### Automation mapping and maintenance

GitHub’s staging and production workflows automate the manual Convex deploy, `bunx convex run seed:init`, web build, and Worker deployment steps. Grégory owns legal-copy approval, protected production approval, and visual/content validation. Update this ADR and the deployment runbook whenever the content format, seed mutation, workflow names, verification fields, or recovery path changes.

## References

- [NIA-37](https://linear.app/niama/issue/NIA-37/render-the-convex-privacy-notice-as-markdown-at-confidentialite)
