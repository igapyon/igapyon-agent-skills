# GitHub Post-Push PR URL

After a successful push and remote equality verification, report a URL that lets the human inspect an existing Pull Request or create one for the branch that was actually pushed.

This workflow is READONLY with respect to GitHub except for the already completed, separately authorized push. It must not create, edit, close, reopen, or merge a Pull Request.

## Inputs

Resolve these values from the completed push and local Git evidence:

- canonical GitHub repository URL
- repository owner
- repository name
- actual remote destination branch used by the successful push

Capture the pushed branch before renaming the local branch to `-done`. When a recovery branch was pushed with an explicit refspec such as `HEAD:devel-feature`, use `devel-feature`, not the differently named local recovery branch.

Do not derive the PR branch from the post-push local branch name because it may end in `-done`.

## Existing Open PR Lookup

For a public GitHub repository, use the anonymous REST API workflow in [github-anonymous-readonly.md](github-anonymous-readonly.md) to query Open Pull Requests whose head is `<owner>:<pushed-branch>`.

Conceptual endpoint:

```text
GET /repos/<owner>/<repository>/pulls?state=open&head=<owner>:<pushed-branch>
```

URL-encode query values. Do not expose credentials or add authenticated mutation behavior.

- If exactly one Open PR matches, report its API-provided `html_url` as `PR: <url>`.
- If multiple Open PRs match, report each direct URL and mark the ambiguity. Do not choose one silently.
- If none match, report a deterministic PR creation URL as described below.
- If the anonymous lookup is unavailable, report the PR creation URL and mark the existing-PR lookup as `未確認`.

## PR Creation URL

When no Open PR is found, derive this browser URL from the canonical repository URL and the pushed branch:

```text
https://github.com/<owner>/<repository>/pull/new/<encoded-pushed-branch>
```

Encode the pushed branch as a URL path component so branch names containing `/` or other reserved characters remain unambiguous.

Report it as:

```text
PR作成URL: <url>
```

This URL is a handoff for the human. Do not open it, submit it, or infer that a PR was created merely because the URL was reported.

## Completion Report

The post-push completion report includes:

```text
GitHubリポジトリ: <url-or-未解決>
PR: <existing-open-pr-url>
```

or, when no Open PR was resolved:

```text
GitHubリポジトリ: <url-or-未解決>
PR作成URL: <creation-url-or-未解決>
```

Keep the recommended tag line required by the publication workflow. A PR URL report does not authorize PR creation, and a recommended tag does not authorize tag creation or push.
