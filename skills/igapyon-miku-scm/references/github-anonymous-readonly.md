# GitHub Anonymous READONLY

Use anonymous GitHub REST API access as the default way to inspect public miku-soft repositories.

## Scope

Use anonymous REST API requests for:

- repository source code and directory contents
- branches
- Issues and Issue comments
- Releases and release assets
- GitHub Actions runs, jobs, and step conclusions

Do not use `gh`, request login, read a token, or send an `Authorization` header for these public READONLY operations. The only `gh` exceptions are the separately documented, human-approved new-Issue creation workflow in [github-issue-create.md](github-issue-create.md) and existing-Issue body update workflow in [github-issue-update.md](github-issue-update.md); neither replaces anonymous inspection.

## Endpoint Patterns

Use `https://api.github.com` with these `GET` endpoint patterns:

```text
/repos/{owner}/{repo}
/repos/{owner}/{repo}/contents/{path}?ref={branch-or-commit}
/repos/{owner}/{repo}/branches
/repos/{owner}/{repo}/branches/{branch}
/repos/{owner}/{repo}/commits/{branch-or-tag}
/repos/{owner}/{repo}/tags?per_page=100
/repos/{owner}/{repo}/issues?state=all&per_page=100
/repos/{owner}/{repo}/issues/{issue_number}
/repos/{owner}/{repo}/issues/{issue_number}/comments
/repos/{owner}/{repo}/releases?per_page=100
/repos/{owner}/{repo}/releases/latest
/repos/{owner}/{repo}/releases/{release_id}
/repos/{owner}/{repo}/releases/{release_id}/assets
/repos/{owner}/{repo}/actions/runs?per_page=100
/repos/{owner}/{repo}/actions/runs/{run_id}/jobs?per_page=100
```

Use only `GET` or `HEAD`. Follow pagination when the response includes a next-page link.

## Local Issue Cache

Cache public Issue lists used for PR matching under the target repository instead of downloading the same list for every draft. Use the bundled helper:

```sh
node skills/igapyon-miku-scm/scripts/github-issues-cache.mjs --repo <owner>/<repo>
```

The default cache is the open-Issue list with a ten-minute freshness window. The helper stores normalized public data under:

```text
workplace/miku-scm/github-cache/<owner>/<repo>/
  issues-open.json
  issues-open.meta.json
```

The Issue data file contains only `number`, `state`, `title`, `body`, `html_url`, and `updated_at`. The metadata file records the repository, requested state, source URL, fetch time, page count, Issue count, and cache policy. Never store request headers, credentials, tokens, or private repository data in this cache.

Apply these rules:

- Reuse a successful same-session result without another request.
- Reuse an on-disk cache whose fetch time is no more than ten minutes old.
- Refresh only when the cache is absent or stale, or when the user explicitly asks for `最新`, `再取得`, `キャッシュ更新`, `キャッシュ上書き`, `refresh`, or equivalent fresh data. Treat that wording as authorization to bypass a still-fresh cache, retrieve every page with `--refresh`, and replace the cache after the complete retrieval succeeds.
- Use `--state all` only when closed or historical Issues are needed. PR drafting uses `--state open` by default.
- Follow every API page, remove entries containing `pull_request`, and replace cache files only after the full retrieval succeeds. An explicit refresh means overwrite-on-success, not deletion-before-fetch.
- If refresh fails and an older cache exists, keep it, report its fetch time and stale status, and use it only with the stale-data qualification. If no cache exists, report Issue matching as unavailable instead of guessing.
- Treat `workplace/` as local operational data. Do not stage or commit the cache.

## Interpretation Rules

- Treat a response containing a `pull_request` field from an Issues endpoint as a Pull Request rather than an Issue.
- Resolve version files at the exact branch commit or tag commit being audited. Do not compare a historical tag only with the current default-branch file.
- Treat anonymous `404` as unresolved: the repository or resource may not exist, may be private, or may not be anonymously visible.
- On `403` or `429`, inspect rate-limit response headers and report the limit. Do not silently authenticate or repeatedly retry.
- Anonymous access cannot inspect private repositories or non-public resources such as draft Releases.
- Keep downloaded content in memory or local scratch space unless this documented Issue-cache workflow applies or the user asks to save it.

## GitHub Actions Log Handoff

Use anonymous Actions run and job endpoints to identify the failing workflow, job, and step. If downloading the raw job log is rejected because authentication or repository permissions are required, do not request a token, login, or elevated GitHub access.

Ask the human to open the failed step in the GitHub Actions UI and copy and paste the relevant error log into the conversation. Treat the pasted log as the evidence for the exact failure message. Local reproduction and repository comparison may continue while waiting, but clearly label conclusions inferred without the pasted log.

## Boundary

Anonymous READONLY inspection does not authorize GitHub mutation. New public Issue creation has one narrow exception under [github-issue-create.md](github-issue-create.md), and an existing public Issue body has one narrow update exception under [github-issue-update.md](github-issue-update.md). Other Issue changes and mutations of Pull Requests, Releases, tags, branches, or repository settings remain outside this rule and require a separately documented and explicitly requested workflow.
