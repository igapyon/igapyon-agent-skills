# Local Git Snapshot

The `repository.status` runner workflow uses
`miku-scm-local-snapshot.mjs` to collect one versioned local snapshot.

It returns:

- repository root
- current branch and HEAD
- upstream plus ahead/behind counts
- staged, unstaged, untracked, and conflicted counts
- worktree paths and checked-out branches
- requested authoritative or coupled version files
- snapshot identity digest and explicit invalidation conditions
- fields that must be revalidated immediately before mutation

The current implementation uses three fixed Git subprocesses:

1. resolve the repository root
2. collect porcelain-v2 branch and working-tree state
3. collect worktree ownership

Version files are read directly without spawning Git. Workflow steps in the
same runner invocation must reuse the returned snapshot instead of repeating
these commands.

The snapshot is invalid after a branch, HEAD, index, working tree, upstream,
fetch, commit, reset, merge, or rebase change. It must never replace
mutation-time revalidation of HEAD, branch, dirty state, or remote
expectation.
