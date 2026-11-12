# Runtime rules: sync pull

Run only for an explicit `miku-scm sync pull` request. Invoke the fixed
`repository.sync.pull --apply` workflow for the target repository. Do not push.

The helper fetches the shared base, preserves staged/unstaged/untracked work,
and chooses the supported no-op, fast-forward, or recorded-base replay. It may
stop for conflicts or unsafe history with retained backup/carryover evidence;
report the exact stopped stage and next action. Never delete the recovery stash
or backup.
Pull requires Git 2.45 or newer. It respects configured fetch refspecs and tag
settings; incomplete branch coverage stops divergent replay instead of widening
the fetch.

An ordinary work branch does not query PR merge state. A local `-done` branch
must be verified as the exact merged PR before next-work creation. If GitHub
reads are unavailable, show the helper's saved branch, HEAD, base and question;
wait for an affirmative reply about that displayed target. Continue the same
operation with its returned ID. The helper rechecks saved state and refetches;
do not infer merge from the original request, choose another pending operation,
or proceed on an ambiguous answer.

If output was cut, read only the exact run's `result.json` and matching
`plan.json`. Never start another pull to redisplay or retry a stopped result.
See `sync-pull.md` for base selection, recovery, and exceptional cases.
