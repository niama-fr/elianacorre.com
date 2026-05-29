# @ec/solid-prevent-scroll2 Fork Notes

This package vendors `solid-prevent-scroll@0.1.10` plus the minimal `@corvu/utils` dependency files it imports.

Included local Corvu utility modules:

- `reactivity`
- `dom`
- `create/style`
- `scroll`

Current state:

- Source is copied from installed compiled package output and not yet adapted for Solid 2 runtime semantics.
- `@corvu/utils/*` imports were rewritten to local files under `src/corvu`.
