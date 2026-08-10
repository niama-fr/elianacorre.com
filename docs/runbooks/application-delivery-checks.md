# Application delivery checks

This runbook keeps the public and authenticated application boundary visible with two low-maintenance controls: repository linting rejects authenticated/reactive imports from `apps/web`, and every production build can report total emitted client JavaScript for each application. Environment-dependent behavior remains a deliberate human staging check.

## Prerequisites and ownership

- Run commands from the repository root with Bun 1.3.10 and frozen dependencies installed.
- Production reporting requires successful `apps/web` and `apps/app` builds. Build-only Convex origins are sufficient; no credentials or deployed backend are needed.
- Linear owns delivery scope and staging evidence. Git owns import policy, reporting code, and this procedure. GitHub Actions owns CI evidence.
- Never paste Cloudflare Access, Convex, OAuth, or application secrets into commands, reports, Linear comments, or repository files.

## Public application boundary

The `apps/web` override in `oxlint.config.ts` rejects imports of Better Auth, TanStack Query, reactive Convex clients, authenticated application source, and administration/member route modules. Run the normal quality check:

```bash
bun run check
```

To verify the rule manually, create `apps/web/src/forbidden-import.fixture.ts` in the editor with the single line `import "@tanstack/react-query";`. Run `bunx oxlint apps/web/src/forbidden-import.fixture.ts`, confirm `eslint/no-restricted-imports` rejects it, then move that exact fixture to Trash and confirm `git status --short` no longer lists it. Never commit the fixture.

This is a source boundary, not proof about every transitive byte emitted by a bundler. Update the restricted list when authenticated/reactive ownership or import names change.

## Independent client JavaScript report

Build and report:

```bash
VITE_CONVEX_SITE_URL=https://build-only.convex.site \
VITE_CONVEX_URL=https://build-only.convex.cloud \
bun run build
bun run delivery:report
```

The report reads emitted `.js` files in each application's `dist/client/assets` directory and prints file count plus raw, gzip, and Brotli totals. Expected output has one `public` line and one `authenticated` line. The totals describe the complete emitted client build, not an initial route, network transfer, or enforced budget. Grégory reviews unexpected movement; CI does not fail on size alone.

If assets are missing, rerun the build. If a total changes unexpectedly, compare build output, dependency changes, and route ownership before delivery. Revert accidental imports or open a scoped optimization issue rather than adding a hidden threshold.

## Two-host staging checklist

After GitHub reports one successful staging deployment for the merge commit:

1. Confirm both Worker deployment summaries name the same SHA and both canonical hosts respond.
2. Open the public homepage with browser network recording. Before approaching the newsletter, confirm newsletter form and confetti chunks are not requested; approach the section and confirm preparation/hydration requests them.
3. Reload and reach the newsletter using only the keyboard. Confirm focus, validation, pending behavior, and submission remain accessible with no hydration warning.
4. Request the same anonymous public HTML URL twice and record `MISS` then `HIT`. Repeat with Cookie and Authorization headers and confirm bypass/no-store. Confirm unsigned and valid signed newsletter capability responses remain no-store.
5. Perform the expiry, stale-revalidation, and privacy-notice purge procedure in `deployment.md`; restore approved staging content afterward.
6. Inspect cached public, dynamic public, and authenticated HTML CSP report-only headers and browser violations. Unexplained violations fail staging.
7. Follow cross-application links in both directions and confirm canonical hosts and full-document navigation.
8. Complete Google sign-in and callback, authenticated SSR, client navigation, refresh, one representative administration mutation, sign-out, and expired-session redirection. Confirm authenticated responses remain no-store and no unexplained hydration warning occurs.

Record the staging workflow URL, commit SHA, concise results, and unresolved observations on NIA-47. These checks require Grégory's authenticated browser session and judgment; they are intentionally not automated.

## Recovery and maintenance

- Boundary failure: move the import and behavior to `apps/app` or shared server-safe code. Change the restriction only when Linear explicitly changes ownership.
- Report failure: rebuild both applications, confirm `dist/client/assets` exists, and rerun the report.
- Runtime failure: stop promotion, restore both Workers to one shared commit using `deployment.md`, correct the owning application, and repeat affected staging checks.
- Suspected private-data caching: follow the emergency cache-disable and Workers Cache purge procedure in `deployment.md`; production actions require Grégory's explicit approval.

GitHub automates the normal quality, typecheck, tests, production build, and post-build report. The commands above are the equivalent manual reporting procedure; the complete install, test, typecheck, quality, build, and diff-check equivalents are listed in [`verification.md`](verification.md). Update this runbook whenever application ownership, restricted imports, build output directories, canonical hosts, cache policy, CSP mode, or staging responsibilities change.
