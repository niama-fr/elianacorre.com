# @ec/solid-primitives2 Fork Notes

This package vendors source files for the Solid Primitives packages currently used by `@ec/kobalte2`.

Included public subpaths:

- `event-listener`
- `intersection-observer`
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

- Source is copied from `solidjs-community/solid-primitives` tag `@solid-primitives/utils@6.4.0` and not yet adapted for Solid 2 runtime semantics.
- `intersection-observer` is copied from `solidjs-community/solid-primitives` `main` package `@solid-primitives/intersection-observer@2.2.4`.
- Internal `@solid-primitives/*` imports were rewritten to `@ec/solid-primitives2/*`.

## Local quality policy

Oxfmt and Oxlint exclude this vendored source. The upstream public API and type shapes intentionally use patterns that conflict with this repository's first-party rules. Project-owned adapters and consumers remain fully formatted and linted.
