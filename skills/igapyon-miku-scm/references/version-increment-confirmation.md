# Version Increment Confirmation Before Add or Commit

Treat version-increment confirmation as a mandatory human gate before running `git add` or `git commit` under the miku SCM workflow.

## Confirmation Gate

1. Inspect the intended staging or commit scope and preserve unrelated changes.
2. Before the first `git add` or `git commit` in that batch, ask the human explicitly:

```text
バージョンのインクリメント忘れはありませんか？
```

3. Wait for the human's answer. Do not run `git add` or `git commit` while the answer is pending.
4. Proceed only after the human confirms that no required increment was forgotten, or after any required version change has been handled and the human confirms it.
5. If the human says an increment is needed, stop the add/commit sequence. Do not change a version automatically unless a separately documented workflow and explicit instruction authorize it.

An explicit version confirmation already given for the same unchanged batch satisfies this gate. Ask again if the intended diff changes after confirmation or a new add/commit batch begins.

This gate governs whether staging and committing may proceed. Continue to use `igapyon-github-writer` for commit-message composition when its workflow is explicitly requested.
