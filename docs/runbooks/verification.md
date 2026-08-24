# Verification

Run these commands from the repository root before opening or merging a pull request:

| Command | Verifies |
| --- | --- |
| `bun run test` | Both applications plus domain validation and isolated Convex authorization, contact, draft, publication, and rollback behavior |
| `bun run typecheck` | Both React applications and first-party domain, backend, and UI packages |
| `bun run check` | Ultracite policy through Oxfmt formatting and Oxlint static-analysis rules |
| `bun run codegen` | Confect registrations and schemas, followed by Convex TypeScript bindings |
| `bun run build` | Both production React clients, TanStack Start servers, and Cloudflare Worker bundles |
| `bun run delivery:report` | Independent total emitted client JavaScript file count plus raw, gzip, and Brotli sizes for `apps/web` and `apps/app` after a build |

## Test scope

Backend tests use `convex-test` with the Better Auth component registered. They exercise real Convex functions against isolated in-memory data and do not require network access or deployment credentials.

The Convex Workflow component is not currently exercised end to end because of an open upstream `convex-test` compatibility issue. Newsletter tests mock Workflow startup and drive the application task execution, provider failure, stable idempotency key, and outcome mutations directly. When upstream compatibility is restored, register `@convex-dev/workflow/test` and replace this seam with scheduled Workflow execution and retry coverage.

Domain tests verify contact validation independently from persistence. Backend coverage verifies unauthenticated and unauthorized rejection, administrator bootstrap assumptions, contact persistence, and the e-book draft-to-published lifecycle.

## Generated code

Run `bun run codegen` from the repository root after changing a Confect Spec, implementation, table, native Convex function, or component registration. The command requires the same Convex deployment selection used by the CLI, through `packages/backend/.env.local` locally or `CONVEX_DEPLOY_KEY` in CI. It first regenerates Confect-owned registrations and then regenerates Convex bindings. The expected result is that a second run produces no tracked diff.

Pull-request CI repeats the command and fails on any generated-code drift. Generated files must not be edited manually. If generation fails before writing files, restore the deployment selection and retry. If it stops after changing files, rerun the full command; only revert generated output when the corresponding source change is also being reverted. Deployment credentials stay in local ignored environment files or GitHub secrets and must never be placed in command arguments or committed configuration.

## Type-check scope

React application type checking follows the independent TanStack route graphs from `apps/web/src/router.tsx` and `apps/app/src/router.tsx`. Domain schemas, Convex functions and tests, and shared React UI are checked through their workspace scripts.

## Delivery checks

See [`application-delivery-checks.md`](application-delivery-checks.md) for the public import boundary, production reporting inputs and limitations, the two-host staging checklist, maintenance, and recovery. Pull-request CI prints the independent client-size report after both applications build.

## Static-quality scope

Ultracite provides the shared formatter and linter presets. The repository scripts invoke the pinned engines directly: Oxfmt formats first-party project code and documentation with a 140-character print width, then Oxlint performs static analysis. Agent skill sources, generated route and Convex files, generated UI wrappers, and `skills-lock.json` remain outside the project formatting boundary.

Oxlint and oxlint-tsgolint check first-party JavaScript and TypeScript with correctness rules plus type-aware TypeScript, import, JSX accessibility, Oxc, Promise, Unicorn, TanStack, and Vitest rules. Generated route manifests, Convex bindings, and UI wrappers remain outside linting because they are generated or maintained upstream. Oxfmt parses and formats CSS, but CSS-specific semantic linting is not currently available in this toolchain.

## Maintaining the Oxc baseline

Prerequisites are Bun 1.3.10, a clean issue branch, and permission to edit the repository ruleset when a required CI check name changes.

1. Pin Ultracite, Oxfmt, Oxlint, and oxlint-tsgolint exactly in the root `devDependencies`.
2. Keep formatter ownership in `oxfmt.config.ts` and linter ownership in `oxlint.config.ts`.
3. Run `bun install`, `bun run fix`, and the complete verification table above.
4. If a GitHub job name changes, open **Settings → Rules → Rulesets → Protect main** and replace only the matching required status-check context. Verify that `Generated code`, `Quality`, `Typecheck`, `Tests`, and `Build` remain required.
5. Confirm a clean installation with `bun install --frozen-lockfile`.

The expected result is a zero-error local check and a pull request whose `Quality` job satisfies branch protection. No credentials belong in configuration files or command arguments.

To recover from a failed tool migration, revert the migration pull request and restore the previous required-check context in the `Protect main` ruleset. The automated dependency, configuration, editor, and CI edits correspond directly to the manual file and GitHub settings changes above. Update this section whenever the toolchain, command interface, ownership boundary, or required check name changes.
