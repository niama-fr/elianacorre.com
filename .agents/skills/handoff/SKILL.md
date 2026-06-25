---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
disable-model-invocation: true
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to the temporary directory of the user's OS - not the current workspace.

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
