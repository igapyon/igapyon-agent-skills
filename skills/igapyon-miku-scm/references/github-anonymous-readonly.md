# GitHub Anonymous READONLY

Use anonymous GitHub REST API access as the default way to inspect public miku-soft repositories.

## Scope

Use anonymous REST API requests for:

- repository source code and directory contents
- branches
- Issues and Issue comments
- Releases and release assets
- GitHub Actions runs, jobs, and step conclusions

Do not use `gh`, request login, read a token, or send an `Authorization` header for these public READONLY operations.

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

## Interpretation Rules

- Treat a response containing a `pull_request` field from an Issues endpoint as a Pull Request rather than an Issue.
- Resolve version files at the exact branch commit or tag commit being audited. Do not compare a historical tag only with the current default-branch file.
- Treat anonymous `404` as unresolved: the repository or resource may not exist, may be private, or may not be anonymously visible.
- On `403` or `429`, inspect rate-limit response headers and report the limit. Do not silently authenticate or repeatedly retry.
- Anonymous access cannot inspect private repositories or non-public resources such as draft Releases.
- Keep downloaded content in memory or local scratch space unless the user asks to save it.

## GitHub Actions Log Handoff

Use anonymous Actions run and job endpoints to identify the failing workflow, job, and step. If downloading the raw job log is rejected because authentication or repository permissions are required, do not request a token, login, or elevated GitHub access.

Ask the human to open the failed step in the GitHub Actions UI and copy and paste the relevant error log into the conversation. Treat the pasted log as the evidence for the exact failure message. Local reproduction and repository comparison may continue while waiting, but clearly label conclusions inferred without the pasted log.

## Boundary

Anonymous READONLY inspection does not authorize GitHub mutation. Creating or updating Issues, Pull Requests, Releases, tags, branches, or repository settings belongs to a separately documented and explicitly requested workflow.
