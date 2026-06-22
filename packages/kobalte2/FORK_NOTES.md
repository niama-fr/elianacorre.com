# @ec/kobalte2 Fork Notes

This package vendors a focused subset of `@kobalte/core@0.13.11` and `@kobalte/utils@0.9.1` for migration toward Solid 2.

Included public component modules:

- `button`
- `dialog`
- `navigation-menu`
- `polymorphic`
- `popover`
- `separator`

The source closure also includes supporting internals used by those modules, including `dismissable-layer`, `i18n`, `list`, `live-announcer`, `menu`, `menubar`, `popper`, `primitives`, `selection`, and local `utils`.

Current state:

- Source is vendored but not yet adapted for Solid 2 runtime semantics.
- Imports of `@kobalte/utils` were rewritten to `@ec/kobalte2/utils`.
- Solid Primitives, `solid-presence`, and `solid-prevent-scroll` imports now resolve to local workspace forks.

## Local quality policy

Oxfmt and Oxlint exclude this vendored source. The upstream public API and type shapes intentionally use patterns that conflict with this repository's first-party rules. Project-owned adapters and consumers remain fully formatted and linted.
