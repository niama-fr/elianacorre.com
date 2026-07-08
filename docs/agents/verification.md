# Verification

Run these commands from the repository root before opening or merging a pull request:

| Command             | Verifies                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `bun run test`      | Domain validation and isolated Convex authorization, contact, draft, publication, and rollback behavior |
| `bun run typecheck` | The React application and first-party domain, backend, and UI packages                                  |
| `bun run check`     | Ultracite policy through Oxfmt formatting and Oxlint static-analysis rules                              |
| `bun run build`     | The production React client, TanStack Start server, and Cloudflare Worker bundle                        |

## Test scope

Backend tests use `convex-test` with the Better Auth component registered. They exercise real Convex functions against isolated in-memory data and do not require network access or deployment credentials.

The Convex Workflow component is not currently exercised end to end because of an open upstream `convex-test` compatibility issue. Newsletter tests mock Workflow startup and drive the application task execution, provider failure, stable idempotency key, and outcome mutations directly. When upstream compatibility is restored, register `@convex-dev/workflow/test` and replace this seam with scheduled Workflow execution and retry coverage.

Domain tests verify contact validation independently from persistence. Backend coverage verifies unauthenticated and unauthorized rejection, administrator bootstrap assumptions, contact persistence, and the e-book draft-to-published lifecycle.

## Type-check scope

React application type checking follows the active TanStack route graph from `apps/web/src/router.tsx`. Domain schemas, Convex functions and tests, and shared React UI are checked through their workspace scripts.

## Static-quality scope

Ultracite provides the shared formatter and linter presets. The repository scripts invoke the pinned engines directly: Oxfmt formats first-party project code and documentation with a 140-character print width, then Oxlint performs static analysis. Agent skill sources, generated route and Convex files, generated UI wrappers, and `skills-lock.json` remain outside the project formatting boundary.

Oxlint and oxlint-tsgolint check first-party JavaScript and TypeScript with correctness rules plus type-aware TypeScript, import, JSX accessibility, Oxc, Promise, Unicorn, TanStack, and Vitest rules. Generated route manifests, Convex bindings, and UI wrappers remain outside linting because they are generated or maintained upstream. Oxfmt parses and formats CSS, but CSS-specific semantic linting is not currently available in this toolchain.

## Maintaining the Oxc baseline

Prerequisites are Bun 1.3.10, a clean issue branch, and permission to edit the repository ruleset when a required CI check name changes.

1. Pin Ultracite, Oxfmt, Oxlint, and oxlint-tsgolint exactly in the root `devDependencies`.
2. Keep formatter ownership in `oxfmt.config.ts` and linter ownership in `oxlint.config.ts`.
3. Run `bun install`, `bun run fix`, and the complete verification table above.
4. If a GitHub job name changes, open **Settings → Rules → Rulesets → Protect main** and replace only the matching required status-check context. Verify that `Quality`, `Typecheck`, `Tests`, and `Build` remain required.
5. Confirm a clean installation with `bun install --frozen-lockfile`.

The expected result is a zero-error local check and a pull request whose `Quality` job satisfies branch protection. No credentials belong in configuration files or command arguments.

To recover from a failed tool migration, revert the migration pull request and restore the previous required-check context in the `Protect main` ruleset. The automated dependency, configuration, editor, and CI edits correspond directly to the manual file and GitHub settings changes above. Update this section whenever the toolchain, command interface, ownership boundary, or required check name changes.
