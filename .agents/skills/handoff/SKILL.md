---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a temporary handoff document summarising the current conversation so a fresh agent can continue the work. Save it to the temporary directory
of the user's OS - not the current workspace. This temporary handoff is a bridge for the next agent; it is not the canonical session synthesis.

For an Elianacorre.com thread closeout, also update or create the canonical Obsidian session synthesis before reporting that the thread is closed
when the conversation produced durable project state, such as issue delivery, workflow changes, decisions, plans, implementation work, verification
evidence, or open loops. Use the Niama Obsidian vault's `Elianacorre.com` project area. Lightweight conversations that produced no durable project
state may close without a new or updated session note, but state that decision explicitly.

The Obsidian session synthesis must include:

- current state;
- open loops and owners;
- canonical links to Linear issues, pull requests, repository docs, ADRs, Drive files, and temporary handoffs as applicable;
- the consumption and manual-responsibility report.

Before final closeout, verify and report:

- the temporary handoff path, if one was created;
- the Obsidian session note path, or the explicit lightweight-session reason no note was needed;
- when the vault is Git-backed, the commit SHA containing the session synthesis update.

Include a "suggested skills" section in the document, which suggests skills that the agent should invoke.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

Include a "consumption and manual handoff" section with:

- a qualitative low/medium/high consumption estimate for each major phase;
- the material cost drivers;
- work the user should perform manually next;
- work where agent judgment remains valuable;
- exact commands or UI steps for the manual work.

Do not claim exact token counts unless an authoritative usage tool reported them.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.
