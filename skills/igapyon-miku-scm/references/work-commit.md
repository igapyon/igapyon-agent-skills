# Work Commit

`work.commit` is the fixed local-apply workflow behind the exact user-facing
command `miku-scm git add commit`. It replaces the ordinary Agent-assembled
`git status` -> `git add` -> check -> `git commit` sequence.

## Invocation

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  work.commit --message "Describe the current work" --apply
```

`--apply` is required. `--message` is optional: callers must supply the one
reviewed title when the current task provides one. The runner reports
`message_source` as `supplied`, `version_fallback`, or `generic_fallback`.
The generic fallback is allowed only when no concrete task title is available;
a version-only change uses the deterministic version-specific title.

The workflow is local only. It never pushes, creates or moves a tag, creates a
Pull Request, or publishes a Release.

## Speed-First Scope

The explicit `git add commit` request means that every current non-ignored
change is in scope. The runner therefore uses fixed `git add --all`; it does
not return to the Agent to select ordinary changed or untracked paths.

It stops before staging only for a merge conflict, a `-done` branch, no
non-ignored changes, a coupled-version mismatch, or a sensitive-path
candidate. The fixed basename denylist is `.env`, `.env.*`, `.npmrc`,
`.netrc`, `.pypirc`, `id_rsa`, `id_dsa`, `id_ecdsa`, `id_ed25519`,
`secret*`, `credential*`, `token*`, and `.pem`, `.p12`, `.pfx`, or `.key`
extensions (case-insensitive where applicable). It evaluates only paths, never
reads candidate content, and requires separate explicit handling rather than
silently committing a candidate.

## One-Shot Sequence

1. Read the repository root, branch, HEAD, every changed/staged/untracked
   non-ignored path, conflict state, and version notice.
2. Resolve only recognised repository checks: `npm run check:index` when the
   tracked `package.json` declares `mikuIndex.required` and that exact script,
   and `mvn validate` when the POM declares `validate-version-alignment`.
3. Stage all current non-ignored changes with `git add --all`.
4. Fix the exact staged path list and binary staged-diff SHA-256. Obtain that
   diff with `--no-ext-diff --no-textconv` so repository-configured renderers
   cannot alter the fingerprint or return a presentation-specific status. The
   fixed Git runner permits at most 64 MiB on each captured output stream so a
   staged diff larger than Node.js's 1 MiB default remains deterministic while
   memory use stays bounded. It never writes the diff body to the result.
5. Run the resolved checks without an Agent or conversational pause.
6. Re-read the staged path list and digest, then require both the unstaged
   tracked-path list and non-ignored untracked-path list to be empty. Any
   changed result stops before commit and reports `partial`; it never commits
   a check-mutated tree without a fresh invocation.
7. Commit the fixed message bytes, then verify the new HEAD and that no
   non-ignored path remains.

The version notice records `increment_observed` when either fixed source
(`pom.xml` or `skills/igapyon-mikuku-agent/references/VERSION.md`) is in the
commit scope, `increment_not_observed` when a resolved version has neither
source in scope, and `not_applicable` when no version is resolved. The latter
two states are informational. A forgotten increment does not block a normal
commit; an actual coupled-source mismatch still blocks because the repository
has declared that invariant.

## macOS and Windows 11

This workflow uses one common Node.js module; it does not require a separate
macOS or Windows script. It invokes `git` directly. For native Windows fixed
checks, a platform adapter invokes only `npm.cmd run check:index` or
`mvn.cmd validate` through `ComSpec` with `/d /s /c`; no caller can pass an
arbitrary command or argument string. macOS/Linux invoke those same fixed
executable-and-argument arrays directly. It does not invoke PowerShell or
`rg`; Git provides the tracked, staged, and untracked-path queries on both
platforms.

## Outcomes

- `committed`: every non-ignored change was committed and the working tree is
  clean.
- `partial`: staging or a check occurred but commit could not safely complete,
  or the post-commit tree was not clean. Inspect the run record; do not repeat
  blindly.
- `conflict` or `not-applied`: no staging occurred.

The runner result and apply attempt are written under
`workplace/miku-scm/runs/<run-id>`. They record the exact paths, staged-diff
digest, commit-message digest, recognised checks, version notice, and final
HEAD. On a Git failure, the diagnostic records the exit code, signal, spawn
error code, bounded stderr, and stdout size and SHA-256; it never embeds raw
staged-diff stdout.
