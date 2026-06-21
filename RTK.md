# RTK - Rust Token Killer (Codex CLI)

**Usage**: Token-optimized CLI proxy for shell commands.

## Mandatory shell contract

Every command sent to a shell execution tool must begin with `rtk`.

- Use a native RTK subcommand when one exists: `rtk git`, `rtk gh`, `rtk test`, `rtk find`, `rtk grep`, and so on.
- Use `rtk proxy <command>` when RTK has no specialized subcommand.
- Use `rtk run '<compound command>'` when shell syntax such as pipes, redirects, loops, or conditionals is required.
- Do not silently fall back to a raw command because RTK filtering is inconvenient.
- Non-shell tools such as file patching, Linear, and other MCP integrations are outside this rule.

Examples:

```bash
rtk git status
rtk test bun run test
rtk proxy bun install
rtk run 'command -v rtk && rtk --version'
```

## Enforcement model

RTK's Codex integration is instruction-based. Codex does not currently expose a pre-command hook that RTK can use to rewrite or reject shell commands automatically.

Enforcement therefore has two layers:

1. Global Codex instructions at `~/.codex/AGENTS.md` load `~/.codex/RTK.md` for every repository.
2. This repository's `AGENTS.md` loads this file and makes the command contract project-specific.

CI cannot verify an agent's local shell command history. Review RTK adoption with its local analytics instead of claiming CI enforcement.

`rtk gain` may display a generic “No hook installed” warning. That is expected in Codex mode and does not mean the global or repository instructions are missing; verify those with `rtk init --codex --global --show`.

## Meta Commands

```bash
rtk gain            # Token savings analytics
rtk gain --history  # Recent command savings history
rtk proxy <cmd>     # Run raw command without filtering
```

## Verification

```bash
rtk init --codex --global --show
rtk gain
rtk gain --history
```
