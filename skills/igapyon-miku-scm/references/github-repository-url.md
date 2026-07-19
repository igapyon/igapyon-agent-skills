# GitHub Repository URL

Answer requests for the GitHub URL of a local repository without changing Git configuration or accessing the network.

## Resolve the Remote

Confirm the target repository, then prefer its `origin` remote:

```sh
git rev-parse --show-toplevel
git remote get-url origin
```

If `origin` does not exist, inspect configured remotes with `git remote -v`.

- Use the only GitHub remote when exactly one exists.
- When multiple GitHub remotes are plausible, show their names and URLs and ask which remote the user means.
- When no GitHub remote exists, report that no GitHub URL is configured. Do not guess from the directory name.

## Format the Answer

Recognize common GitHub remote forms, including:

```text
git@github.com:OWNER/REPOSITORY.git
ssh://git@github.com/OWNER/REPOSITORY.git
https://github.com/OWNER/REPOSITORY.git
```

Convert the selected remote to this canonical browser URL:

```text
https://github.com/OWNER/REPOSITORY
```

Strip only the transport-specific prefix and a trailing `.git`. Preserve the owner and repository path exactly. Report the canonical browser URL first and the configured remote URL second. Do not expose embedded credentials or tokens; redact them if present.

## Boundary

Do not run `git remote set-url`, access GitHub, fetch, pull, or push for a URL query. URL resolution is local and READONLY.
