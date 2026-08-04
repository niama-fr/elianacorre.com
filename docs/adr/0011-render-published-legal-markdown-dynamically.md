# Render published legal Markdown dynamically

## Status

Accepted

## Context

The privacy-policy route must render the active published Convex privacy notice without duplicating legal copy in the web application. Legal-copy changes should remain fresh without requiring a site deployment, while the resulting document must be crawlable, semantic, and safe to render.

## Decision

Store privacy-notice content as CommonMark Markdown and fetch the active published privacy notice once, through a TanStack Start server function, in the public layout loader. The server function owns the Convex HTTP client and environment access; public routes receive the result as ordinary loader data and do not import Convex React Query. The privacy route reuses its parent layout's notice rather than issuing another query. The invariant newsletter-consent sentence is repository-owned website copy rather than a published legal-text version. Raw HTML is outside the supported contract. The web renderer permits only HTTP, HTTPS, mail, telephone, root-relative, and fragment links, and shifts Markdown headings below the route’s page heading.

The existing plain-text privacy records require no content backfill because plain text is valid CommonMark. Running the Convex seed after deployment creates and publishes a new privacy-notice version when the canonical Markdown content differs. New newsletter consent evidence stores the exact published privacy-notice ID presented with the form. The completed NIA-48 migrations removed the obsolete bundle records and newsletter-consent legal-text records.

Route loading fails through the application error path when Convex is unavailable or the active privacy notice is missing. Empty legal Markdown also fails explicitly. The route does not silently serve duplicated, empty, or indefinitely stale policy text.

## Consequences

Published changes can become visible without rebuilding the web application, and crawlers receive rendered HTML. The privacy notice crosses a server-only application boundary and is not added to the browser's reactive Convex dependency graph. Anonymous successful HTML is cached only by Cloudflare for one hour, with a five-minute stale-while-revalidate window; browsers receive `private, no-store`. Shared HTML carries the `privacy-notice` cache tag. Publishing changed privacy Markdown schedules an authenticated request to the public Worker, which purges that tag and makes the next request render the new notice. If invalidation is not configured or fails, publication remains successful and the notice is still visible within the nominal 65-minute TTL/SWR bound. An uncached gateway executes before every external request and forwards only eligible anonymous reads to the `CachedApp` entrypoint. Cookie-bearing and authorization-bearing requests, signed newsletter capabilities, mutations, redirects, errors, and other non-public responses therefore bypass shared-cache lookup as well as storage.

Routes declare cache intent through native TanStack `headers`: the public root declares shared HTML, capability routes override it as private, discovery routes declare their shared resource policy, and the authenticated root declares private intent. The `@ec/http` package owns shared HTTP protocol vocabulary, each application owns enforcement under `src/http`, and document metadata and crawler discovery remain under `src/seo`. The public Worker's default entrypoint is an uncached gateway that applies request-level eligibility before calling the cached `CachedApp` through a loopback export. The cached application consumes and removes the internal intent header, enforces response-level safety conditions, and defaults every undeclared or unsafe response to private no-store. This two-stage enforcement is necessary because Workers Caching performs lookup before invoking a cached entrypoint. NIA-46 owns the separate application-specific CSP and middleware work; cache classification must remain independent of that policy.

Because the root public layout renders the current notice and newsletter form on every HTML route, build-time prerendering would freeze legal publication until the next deployment. Public HTML therefore remains server-rendered and bounded by the edge policy. Repository-owned discovery documents (`robots.txt` and `sitemap.xml`) retain their explicit shared policies, and the sitemap enumerates every repository-defined artwork path. Page availability depends on Convex and the active privacy notice after the stale window. Markdown features remain intentionally constrained; adding raw HTML or broader URL handling requires a new security review.

## Publication runbook

### Outcome and prerequisites

The procedure publishes repository-approved privacy Markdown as a new immutable Convex record and requests immediate invalidation of privacy-bearing public HTML. The operator needs repository access, permission to view the target Convex deployment and public Cloudflare Worker, and—only for production—permission to dispatch and approve the protected production workflow. The matching `CACHE_REVALIDATION_SECRET` must be configured in both systems as described in the deployment runbook. The legal-copy change must be reviewed and merged first. Git and Bun must be installed; `bun install` installs the Convex CLI dependency.

### Canonical systems and security

Linear owns the delivery task, Git owns approved legal copy and this decision, Convex owns published privacy-notice versions, and GitHub Actions owns deployment evidence. Secrets stay in GitHub environments, ignored local environment files, or the Convex dashboard; never paste their values into Git, Linear, Obsidian, command arguments, or Markdown.

### Manual procedure and expected results

1. From the repository root, run `git pull --ff-only origin main` and confirm the legal-copy commit is present with `git log -1 --oneline`. The checkout must be clean and current.
2. For staging, open GitHub **Actions → Deploy staging**, select the workflow run for that merge, and wait for its `bunx convex run seed:init` step to succeed. A changed canonical notice creates one published `privacyNotice` record; unchanged content creates none.
3. For a local development deployment only, run `cd packages/backend` followed by `bunx convex run seed:init`. The selected Convex deployment comes from the existing local Convex configuration.
4. For production, follow the protected SemVer promotion procedure in [`docs/agents/deployment.md`](../agents/deployment.md). The approved workflow runs the same `seed:init` mutation; do not run it manually against production.

### Verification

In the target Convex dashboard, inspect **Data → legalTexts** and confirm the latest published `privacyNotice.content` matches the repository constant. Confirm the schema has no newsletter legal-bundle table and the seed did not create a `newsletterConsent` legal text. Inspect Convex function logs and confirm `cache:revalidatePrivacyNotice` returned `revalidated`; `skipped` means its secret is absent, while an exception records an endpoint or authentication failure. Then load `/confidentialite`, view the server response or page source, and confirm the current privacy title, headings, lists, emphasis, mail link, and CNIL link are present. The first request after a successful purge is a cache `MISS`; the following request is a `HIT`. `/mentions-legales` must remain distinct.

### Recovery and rollback

If the seed fails, the previous active privacy notice remains authoritative: correct the code and rerun the workflow. If invalidation fails after publication, verify the shared secret on both systems and rerun `cache:revalidatePrivacyNotice`; the existing TTL/SWR bound remains active meanwhile. If incorrect content becomes active, restore the last approved content in a new issue and pull request, then deploy normally; the idempotent seed publishes that content as a new version. Use the protected rollback workflow from `docs/agents/deployment.md` only when the application deployment itself must also be reverted. Never delete or edit historical production legal records.

### Automation mapping and maintenance

GitHub’s staging and production workflows automate the manual Convex deploy, `bunx convex run seed:init`, web build, and Worker deployment steps. Grégory owns legal-copy approval, protected production approval, and visual/content validation. Update this ADR and the deployment runbook whenever the content format, seed mutation, workflow names, verification fields, or recovery path changes.

## Subscription evidence migration record

### Outcome

The NIA-48 expand–migrate–contract process added `privacyNoticeId` to historical subscriptions. The backfill was completed and verified in development, staging, and production before cleanup began. `privacyNoticeId` is now required; active requests, reads, and writes no longer accept or resolve bundle references. Grégory subsequently chose to remove the obsolete bundle references and rows while retaining the underlying legal texts.

### Completed procedure and retained evidence

1. The compatible release made both references optional, wrote `privacyNoticeId`, and temporarily accepted legacy requests.
2. Each environment ran `migrations:backfillSubscriptionPrivacyNoticeIds`, then verified that every subscription had `privacyNoticeId` and that sampled legacy references resolved to the same privacy notice.
3. Production `v1.0.2` deployed the compatible release through the protected workflow before the production backfill was run and verified.
4. The cleanup release requires `privacyNoticeId` and removes the backfill, bundle query, legacy request input, and read fallback. It exposes two resumable migrations: `migrations:clearSubscriptionLegalBundleIds` and `migrations:deleteNewsletterLegalBundles`.
5. In each environment, dry-run and then execute `clearSubscriptionLegalBundleIds`. Verify no subscription has `legalBundleId` before dry-running and executing `deleteNewsletterLegalBundles`.
6. Each environment was verified with an empty bundle table, no subscription `legalBundleId`, and a retained `privacyNoticeId` on every subscription.
7. The first contract release removed the legacy field and table from the schema together with the cleanup migrations and Migrations component.
8. After newsletter-consent legal-text rows were deleted and verified absent in every environment, the final contract release removed `newsletterConsent` from the legal-text kind schema and removed its completed migration.

### Recovery and maintenance

The cleanup preserved `privacyNoticeId`, consent lifecycle fields, and privacy-notice legal texts. A rollback after cleanup must use a version that understands required `privacyNoticeId`; the pre-migration application is no longer safe. If verification finds a missing privacy reference, stop and investigate rather than deleting anything further.

## References

- [NIA-37](https://linear.app/niama/issue/NIA-37/render-the-convex-privacy-notice-as-markdown-at-confidentialite)
