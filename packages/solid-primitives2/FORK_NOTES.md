# @ec/solid-primitives2 Fork Notes

This package vendors the compiled ESM/declaration output for the Solid Primitives packages currently used by `@ec/kobalte2`.

Included public subpaths:

- `event-listener`
- `keyed`
- `map`
- `media`
- `props`
- `refs`
- `rootless`
- `static-store`
- `trigger`
- `utils`

Current state:

- Source is copied from installed Solid Primitives packages and not yet adapted for Solid 2 runtime semantics.
- Internal `@solid-primitives/*` imports were rewritten to `@ec/solid-primitives2/*`.
