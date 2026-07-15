---
name: obsidian-vault
description: Search, create, and manage notes in the Obsidian vault with wikilinks and index notes. Use when user wants to find, create, or organize notes in Obsidian.
---

# Obsidian Vault

## Resolve the vault

Resolve the vault before reading or writing notes. Store the selected absolute path in `VAULT_ROOT` and reuse it throughout the task.

1. Use an explicit vault path supplied by the user when available.
2. Otherwise, read Obsidian's vault registry:
   - macOS: `~/Library/Application Support/obsidian/obsidian.json`
   - Linux: `~/.config/obsidian/obsidian.json`
   - Windows: `%APPDATA%/obsidian/obsidian.json`
3. For this repository, select the registered Niama vault, normally a path containing `/niama/`. Do not select another vault merely because it has `"open": true`.
4. If the registry is unavailable, use `/Users/gregorybouteiller/Coding/niama/vault` only when that path exists.
5. If no candidate exists or multiple candidates remain ambiguous, ask the user for the vault path before writing.

On macOS, list registered paths with:

```bash
jq -r '.vaults[].path' "$HOME/Library/Application Support/obsidian/obsidian.json"
```

The Niama vault is mostly flat at its root.

## Naming conventions

- **Index notes**: aggregate related topics (e.g., `Ralph Wiggum Index.md`, `Skills Index.md`, `RAG Index.md`)
- **Title case** for all note names
- No folders for organization - use links and index notes instead

## Linking

- Use Obsidian `[[wikilinks]]` syntax: `[[Note Title]]`
- Notes link to dependencies/related notes at the bottom
- Index notes are just lists of `[[wikilinks]]`

## Workflows

### Search for notes

```bash
# Search by filename
rg --files "$VAULT_ROOT" | rg -i 'keyword.*\.md$'

# Search by content
rg -l 'keyword' "$VAULT_ROOT" --glob '*.md'
```

Or use Grep/Glob tools directly on the vault path.

### Create a new note

1. Use **Title Case** for filename
2. Write content as a unit of learning (per vault rules)
3. Add `[[wikilinks]]` to related notes at the bottom
4. If part of a numbered sequence, use the hierarchical numbering scheme

### Find related notes

Search for `[[Note Title]]` across the vault to find backlinks:

```bash
rg -l '\[\[Note Title\]\]' "$VAULT_ROOT" --glob '*.md'
```

### Find index notes

```bash
rg --files "$VAULT_ROOT" | rg '/[^/]*Index[^/]*\.md$'
```
