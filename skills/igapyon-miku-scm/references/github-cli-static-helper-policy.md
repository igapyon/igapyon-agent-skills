# GitHub CLI Static Helper Policy

Use `gh` only behind a repository-provided deterministic helper. Never let the AI Agent assemble or invoke `gh` directly.

GitHub includes Enterprise and similar hosting services; no hostname allowlist
applies. Repository options accept `[host/]owner/repo`. Retain a known host from
the selected remote or request, and use `GH_HOST` when configured for an
unqualified repository. Fixed API reads use `--hostname` from that repository,
and response URLs are checked against the selected host/path rather than
`github.com`. These forms follow the [GitHub CLI repository option](https://cli.github.com/manual/gh_issue_view),
[API hostname option](https://cli.github.com/manual/gh_api), and
[environment settings](https://cli.github.com/manual/gh_help_environment).
Helpers retain a configured host in the prepared repository argument so that a
later environment change does not select a different service during apply.

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

## Generic Issue READONLY Helper

Use [../scripts/github-issue-read.mjs](../scripts/github-issue-read.mjs) for generic public Issue retrieval. The AI Agent invokes the helper, never `gh` directly. Its fixed READONLY command surface is:

```text
gh issue list --repo <[host/]owner/repo> --state <open|closed|all> --limit 1000 --json number,state,title,body,url,updatedAt
gh issue view <positive-number> --repo <[host/]owner/repo> --json number,state,title,body,url,updatedAt,labels,comments
gh label list --repo <[host/]owner/repo> --limit 1000 --json name,description,color
```

The operation-specific readers also request complete comment snapshots for
review and composite-operation checks:

```text
Issue update/comment/label view: number,url,title,body,state,labels,updatedAt,comments
Issue close view: number,url,title,body,state,stateReason,updatedAt,labels,comments
Issue create parent view: number,url,title,state,updatedAt
Issue create verification: number,url,labels,parent
```

For Issue views, `comments` is a paginated connection. Validate that it has a
`nodes` array and integer `totalCount`, that the count equals the node length,
and that `pageInfo.hasNextPage` is not true. Reject incomplete comment evidence
before showing an approval review or applying a write.

Every Issue write must be prepared and applied through `miku-scm-run.mjs`.
Show the complete saved operation plan, then wait for a separate user message
whose entire trimmed text is exactly `approve` or `miku-scm approve` (or a
documented explicit selector form). Do not invoke an Issue helper's `--apply`
mode directly; its `gh` command surface is an internal runner interface.

Use `--list` for an uncached general Issue list, `--issue <number>` for one Issue and its comments, and `--labels` for repository labels. For PR Issue matching, retain the ten-minute cache workflow in `github-issues-cache.mjs`; it has its own fixed `gh issue list` surface. Do not substitute anonymous REST for a helper failure.

## Static Helper Requirements

Require every helper that invokes `gh` to:

1. Live under the skill's tracked `scripts/` directory.
2. Enumerate each allowed `gh` subcommand and flag in its workflow reference.
3. Validate repository, Issue number, paths, digests, labels, reasons, and every other variable input.
4. Reject unknown arguments and arbitrary pass-through options.
5. Invoke `gh` as an argument array without a shell, interactive mode, browser mode, aliases, or user-provided command fragments.
6. Keep READONLY commands distinct from mutation commands.
7. For Issue writes, route through the complete review and exact `approve` handoff; a preflight alone is never approval. For other workflows, require that workflow's documented human approval before mutation.
8. Persist the required attempt record before mutation and never repeat a mutation automatically.
9. Verify the resulting remote state with a fixed READONLY `gh` command when the workflow requires confirmation.
10. Treat authentication setup, token inspection, scope changes, and credential handling as outside the helper.

Adding or changing an allowed `gh` command requires a tracked helper change, matching workflow documentation, and tests that assert the exact argument array.

## Repository Maintenance READONLY Commands

The repository-maintenance helper may invoke only these fixed commands:

```text
gh api --method GET repos/<owner>/<repo>/pulls [--hostname <selected-host>] -f state=all -f head=<owner>:<branch> -f per_page=100
gh api --method GET repos/<owner>/<repo>/pulls/<positive-number> [--hostname <selected-host>]
```

Use the first command only for a local `-done` diagnosis and the second only
to revalidate a PR number fixed in a reviewed maintenance plan. Validate every
owner, repository, branch, and number. Do not pass `--paginate`, arbitrary
fields, headers, or user-provided command fragments. The fixed helper derives
`--hostname` only from the selected repository; it is not a pass-through option.
Apply a 15-second process timeout and stop further PR reads after the first failure.

## Failure Semantics

The separate [sync-pull.md](sync-pull.md) helper may use its two fixed PR GET
commands, including the validated base filter, only on a `-done` sync pull.
When `gh` is not installed (`ENOENT`), that fixed helper alone may read those
same endpoints anonymously with Node.js HTTPS using the selected host's API
base, documented in `sync-pull.md`. It retains the same PR checks and stops on
unreadable evidence. This exception does not apply to authentication or API
failures from an installed `gh`, or to any other helper or Issue operation.
It verifies exact head/base identities and that the merge result is in the
fetched base before local work mutation. Normal work branches make no PR
reads. If these reads are unavailable, the documented sync pull continuation
can consume an explicit human merge report for the saved target. Its result
identifies human confirmation rather than claiming API verification. This does
not override unmerged or mismatched PR evidence. This allowlist does not authorize
GitHub mutation or direct Agent gh.

- A READONLY `gh` failure before mutation is `not-applied`; report that no mutation command ran.
- A reviewed-state mismatch is `conflict`; do not mutate.
- A mutation command failure or an unverifiable post-mutation result is `unresolved`; do not retry automatically.
- A verified exact result is the only successful terminal state.

Do not call an outcome uncertain merely because a pre-mutation READONLY command failed. Do not call it successful merely because the mutation process exited with zero when the workflow requires exact post-verification.
