---
name: implement
description: "Implement one agreed piece of work from a specification or agent-ready ticket, leaving a reviewable working tree for human delivery."
disable-model-invocation: true
---

Implement the work described by the user, specification, or agent-ready ticket.

Before editing, inspect the relevant code and requirements. Load `CONTEXT.md`, ADRs, or runbooks only when they are relevant to the work.

Prefer the smallest end-to-end slice that can validate the implementation direction before expanding the change.

Use `/tdd` where possible, at pre-agreed seams.

During implementation:

* run relevant individual tests regularly;
* run focused typechecking or quality checks when useful;
* diagnose failures with the smallest useful reruns;
* keep changes within the delegated scope;
* do not run the complete repository verification suite unless explicitly delegated or required to diagnose a failure.

When implementation is complete:

* leave the working tree in a reviewable state;
* summarize what changed;
* report focused verification already performed;
* surface unresolved questions, risks, or pending human validation;
* identify the remaining human-owned verification and delivery steps.

Do not perform `/code-review` as part of implementation. Review should happen separately, preferably in a fresh context.

Do not commit, push, create a pull request, mutate Linear, deploy, merge, or perform other delivery operations unless explicitly delegated.
