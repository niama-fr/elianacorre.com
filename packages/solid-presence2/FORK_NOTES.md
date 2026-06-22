# @ec/solid-presence2 Fork Notes

This package vendors source files for `solid-presence@0.1.8` plus the minimal `@corvu/utils/reactivity` source files it imports.

Current state:

- Source is copied from `corvudev/corvu` tag `solid-presence@0.1.8` and not yet adapted for Solid 2 runtime semantics.
- `@corvu/utils/reactivity` imports were rewritten to local files under `src/corvu`.

## Local quality policy

Oxfmt and Oxlint exclude this vendored source. The upstream public API and type shapes intentionally use patterns that conflict with this repository's first-party rules. Project-owned adapters and consumers remain fully formatted and linted.
