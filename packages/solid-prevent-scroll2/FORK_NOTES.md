# @ec/solid-prevent-scroll2 Fork Notes

This package vendors source files for `solid-prevent-scroll@0.1.10` plus the minimal `@corvu/utils` source files it imports.

Included local Corvu utility modules:

- `reactivity`
- `dom`
- `create/style`
- `scroll`

Current state:

- Source is copied from `corvudev/corvu` tag `solid-prevent-scroll@0.1.10` and not yet adapted for Solid 2 runtime semantics.
- `@corvu/utils/*` imports were rewritten to local files under `src/corvu`.

## Local quality policy

Oxfmt and Oxlint exclude this vendored source. The upstream public API and type shapes intentionally use patterns that conflict with this repository's first-party rules. Project-owned adapters and consumers remain fully formatted and linted.
