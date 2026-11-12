# Runtime rules: merged work branch

Run only after the user confirms the PR merge for the displayed `-done` branch.
Use `repository.post-merge.next-work --confirmed-merged --apply`; the helper
refreshes the shared base, checks the tag recommendation, and creates the next
work branch with Git's tracking settings.

Unstaged and untracked changes are carried through branch creation with the
exact stash the helper creates. Restored changes remain unstaged; retain the
stash after success or failure. Staged changes stop the transition. Report the
current branch and retained stash on any stopped result. Do not push or modify
the tag/Release as part of this handoff.
