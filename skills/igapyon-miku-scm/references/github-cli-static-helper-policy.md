# GitHub CLI Static Helper Policy

Use `gh` only behind a repository-provided deterministic helper. Never let the AI Agent assemble or invoke `gh` directly.

## Core Boundary

Distinguish the caller from the implementation:

- **Forbidden:** the AI Agent directly invokes `gh`, constructs an ad hoc `gh` command, passes arbitrary extra arguments, or uses a shell wrapper to expand the command.
- **Allowed:** the AI Agent invokes a documented static Node helper, and that helper invokes only its fixed and validated `gh` command surface without a shell.

The permission belongs to the reviewed helper implementation, not to `gh` generally. Approval of one helper or command shape never authorizes another.

## Preferred Read Path

When a documented static helper exists for the workflow, prefer fixed `gh` reads inside that helper over anonymous REST reads. This applies to precondition checks, conflict detection, and post-mutation verification. Authenticated `gh` reads normally avoid anonymous rate limits and intermediary cache or gateway delays.

Use anonymous REST directly only when:

- no documented static helper covers the READONLY inspection
- the workflow explicitly keeps a drafting or discovery phase anonymous
- public evidence must remain available without GitHub CLI authentication

Do not add direct `gh` use merely because an anonymous request failed. Add or revise a static helper, document its exact command surface, and test it first.

## Static Helper Requirements

Require every helper that invokes `gh` to:

1. Live under the skill's tracked `scripts/` directory.
2. Enumerate each allowed `gh` subcommand and flag in its workflow reference.
3. Validate repository, Issue number, paths, digests, labels, reasons, and every other variable input.
4. Reject unknown arguments and arbitrary pass-through options.
5. Invoke `gh` as an argument array without a shell, interactive mode, browser mode, aliases, or user-provided command fragments.
6. Keep READONLY commands distinct from mutation commands.
7. Display the exact planned mutation during preflight and require the workflow's human approval before mutation.
8. Persist the required attempt record before mutation and never repeat a mutation automatically.
9. Verify the resulting remote state with a fixed READONLY `gh` command when the workflow requires confirmation.
10. Treat authentication setup, token inspection, scope changes, and credential handling as outside the helper.

Adding or changing an allowed `gh` command requires a tracked helper change, matching workflow documentation, and tests that assert the exact argument array.

## Failure Semantics

- A READONLY `gh` failure before mutation is `not-applied`; report that no mutation command ran.
- A reviewed-state mismatch is `conflict`; do not mutate.
- A mutation command failure or an unverifiable post-mutation result is `unresolved`; do not retry automatically.
- A verified exact result is the only successful terminal state.

Do not call an outcome uncertain merely because a pre-mutation READONLY command failed. Do not call it successful merely because the mutation process exited with zero when the workflow requires exact post-verification.
