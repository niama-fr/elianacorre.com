# Verification

Run these commands from the repository root before opening or approving a pull request:

| Command | Verifies |
| --- | --- |
| `bun run test` | Critical public routes and loader content in both applications, plus contact validation and the isolated persistence boundary |
| `bun run typecheck` | The stable application, the active Solid 2 route graph, and first-party domain, backend, and stable UI packages |
| `bun run check` | Ultracite formatting and lint rules |
| `bun run build` | Production client and server builds for both applications |

## Test scope

Application route smoke tests read each generated route manifest and exercise the public domain readers used by critical pages. They do not require a browser, network access, or production credentials.

Contact tests call the shared submission interface with an injected in-memory persistence function. They verify that invalid values never reach persistence and valid values cross the successful submission boundary without sending data to Convex.

## Type-check scope

Solid 1 type checking follows its complete application route graph. Solid 2 type checking follows the active route graph from `src/router.tsx`; dormant migration prototypes that are not imported by the application remain outside this check until their feature slice activates them.

Vendored Solid 2 migration packages retain their documented upstream compatibility policy. First-party consumers remain covered through the active application graph.
