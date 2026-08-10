---
name: prototype
description: Build a throwaway prototype to answer a design question. Use when the user wants to sanity-check whether a state model or logic feels right, or explore what a UI should look like.
---

# Prototype

A prototype is throwaway code that answers a question. The question decides the shape.

## Pick a branch

Identify which question is being answered from the user's prompt and surrounding code:

* "Does this logic / state model feel right?" → `LOGIC.md`. Build the smallest interactive artifact that makes difficult state transitions concrete.
* "What should this look like?" → `UI.md`. Generate clearly differentiated UI variations that the user can compare directly.

If the question is genuinely ambiguous, prefer the branch that best matches the surrounding code and state the assumption.

## Rules that apply to both

1. **Throwaway from day one.** Clearly mark prototype code as disposable and keep it close to the code or product area it explores.

2. **Trivial to run.** Use the project's existing tooling and conventions. Do not create unnecessary infrastructure merely to host a prototype.

3. **No persistence by default.** Keep state in memory unless persistence itself is the question being tested. Never use production data or a production deployment for a prototype unless explicitly delegated.

4. **Skip production polish.** Do not add abstractions, comprehensive error handling, or production hardening. Add tests only when the question being answered specifically requires them.

5. **Surface the important state.** Make the behavior or comparison visible enough that the user can evaluate the design question directly.

6. **Capture the answer.** Once the prototype has answered its question:

   * state the question that was tested;
   * record the resulting decision or remaining uncertainty;
   * fold validated decisions into the real implementation only when that work is within the delegated scope;
   * identify prototype files that are now disposable or worth preserving as a temporary reference.

7. **Respect the repository delivery boundary.** Do not commit, push, create or publish a pull request, or otherwise publish prototype artifacts unless explicitly delegated.

If preserving the prototype in a throwaway branch would be useful, leave the working tree in a reviewable state and provide the human with:

* the prototype files to preserve;
* a suggested throwaway branch name;
* suggested commit wording;
* the issue or specification that should receive the reference.

The human decides whether the prototype is worth committing and publishing.

A prototype is successful when it resolves the design question cheaply. It is not production code merely because it worked.
