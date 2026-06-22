# Verification

Run these commands from the repository root before opening or approving a pull request:

| Command             | Verifies                                                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `bun run test`      | Critical public routes and loader content in both applications, plus the contact validator and isolated persistence boundary |
| `bun run typecheck` | The stable application, the active Solid 2 route graph, and first-party domain, backend, and stable UI packages              |
| `bun run check`     | Oxfmt formatting and Oxlint static-analysis rules                                                                            |
| `bun run build`     | Production client and server builds for both applications                                                                    |

## Test scope

Application route smoke tests read each generated route manifest and exercise the public domain readers used by critical pages. They do not require a browser, network access, or production credentials.

Contact tests exercise the validator used by the server functions and the backend persistence adapter independently. They verify invalid values are rejected and validated values cross the successful persistence boundary without sending data to Convex.

## Type-check scope

Solid 1 type checking follows its complete application route graph. Solid 2 type checking follows the active route graph from `src/router.tsx`; dormant migration prototypes that are not imported by the application remain outside this check until their feature slice activates them.

Vendored Solid 2 migration packages retain their documented upstream compatibility policy. First-party consumers remain covered through the active application graph.

## Static-quality scope

Oxfmt formats first-party project code and documentation with a 140-character print width. Agent skill sources, generated route and Convex files, generated UI wrappers, vendored Solid 2 compatibility sources, and `skills-lock.json` remain outside the project formatting boundary.

Oxlint checks first-party JavaScript and TypeScript with its correctness rules plus the built-in TypeScript, import, JSX accessibility, Oxc, Promise, Unicorn, and Vitest plugins. Generated route manifests, generated Convex bindings, generated UI wrappers, and vendored Solid 2 compatibility sources remain outside linting because they are replaced or maintained upstream.

Oxlint does not currently provide native Solid, TanStack Router, or CSS lint presets equivalent to the former Ultracite/Biome presets. Type checking and route smoke tests cover the active Solid and TanStack graphs; Oxfmt parses and formats CSS, but CSS-specific semantic linting is not currently available in the Oxc toolchain.

## Maintaining the Oxc baseline

Prerequisites are Bun 1.3.10, a clean issue branch, and permission to edit the repository ruleset when a required CI check name changes.

1. Pin Oxfmt and Oxlint in the root `devDependencies`.
2. Keep formatter ownership in `.oxfmtrc.json` and linter ownership in `.oxlintrc.json`.
3. Run `bun install`, `bun run fix`, and the complete verification table above.
4. If the GitHub job name changes, open **Settings → Rules → Rulesets → Protect main** and replace only the matching required status-check context. Verify that `Quality`, `Typecheck`, `Tests`, `Build`, `Preview`, and `Approval` remain required.
5. Confirm a clean installation with `bun install --frozen-lockfile`.

The expected result is a zero-error local check and a pull request whose `Quality` job satisfies branch protection. No credentials belong in configuration files or command arguments.

To recover from a failed tool migration, revert the migration pull request and restore the previous required-check context in the `Protect main` ruleset. The automated dependency, configuration, editor, and CI edits correspond directly to the manual file and GitHub settings changes above. Update this section whenever the toolchain, command interface, ownership boundary, or required check name changes.
