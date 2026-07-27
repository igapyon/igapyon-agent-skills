# Post-Recommit Publication

Use this workflow only after PR Soft Reset Recommit has succeeded, the new full
commit SHA has been displayed, and the human is deciding whether to say
`ok push` for that exact commit and remote state.

The bundled helper is the authoritative implementation:

```text
scripts/post-recommit-publish.mjs
```

It automates the separately approved remote publication, post-push equality
check, local `-done` rename, and completion report. It does not interpret the
conversation. The agent passes `--apply` only after the human explicitly says
`ok push` or gives equivalent approval for the displayed preflight.

## Human Review Boundary

Resolve the full reviewed local commit SHA, then run read-only preflight before
asking for publication approval:

```sh
node skills/igapyon-miku-scm/scripts/post-recommit-publish.mjs \
  --expected-head <reviewed-full-sha>
```

Preflight verifies the repository, branch, exact local `HEAD`, clean status,
local `-done` collision, remote, optional upstream, and exact remote branch
state. It uses `git ls-remote` but does not fetch, push, create or rename a
branch, or change a file.

To save the reviewed state as the one-time publication plan used by the normal
`ok push` handoff, append `--save-plan`. The helper stores JSON only below
`workplace/miku-scm/ok-push/`, returns its relative path and SHA-256, and does
not publish in that mode. After the human says `ok push`, apply that exact plan
in one helper invocation:

```sh
node skills/igapyon-miku-scm/scripts/post-recommit-publish.mjs \
  --apply-plan workplace/miku-scm/ok-push/<plan>.json \
  --expected-plan-sha256 <reviewed-sha256>
```

Plan application rechecks the branch, HEAD, clean state, local `-done`
collision, and remote expectation before pushing. It rejects path escape,
digest changes, and a plan that already has an attempt record. It claims the
attempt record only after every pre-mutation check succeeds and immediately
before push. A failure before that claim leaves the reviewed plan unconsumed;
after the claim, it never retries the push automatically.

The JSON result contains `apply_arguments`. Show the preflight result together
with the reviewed commit log. Treat the local `HEAD`, pushed branch, remote,
and either the existing remote full SHA or the assertion that the remote branch
is absent as one review unit.

After the human says `ok push`, invoke the helper once with the exact returned
arguments. Do not ask another conversational confirmation while the verified
state remains unchanged.

## Fixed Remote Expectation

An existing remote branch requires:

```text
--expected-remote-head <reviewed-full-sha>
```

The helper must not derive the force-with-lease expectation from the
remote-tracking ref updated by its own fetch. It checks the remote branch
against the reviewed SHA before and after fetch, then uses both an explicit
destination and explicit lease:

```sh
git push \
  --force-with-lease=refs/heads/<branch>:<expected-remote-head> \
  origin HEAD:refs/heads/<branch>
```

This prevents a remote update made after preflight from becoming an implicitly
accepted lease merely because `git fetch origin` observed it.

A remote branch that was absent during review requires:

```text
--expect-new-remote-branch
```

The new-branch push also names its exact destination:

```sh
git push -u origin HEAD:refs/heads/<branch>
```

If the branch appears after review, apply mode stops. If it appears in the
remaining race before push, normal non-force push rejection stops the workflow.

Never use plain `--force`. Never use an implicit `--force-with-lease` without
the reviewed remote SHA.

## Apply Sequence

Apply mode performs these operations in order:

1. Require macOS and resolve the repository.
2. Verify the current non-`-done` branch and clean worktree/index.
3. Verify exact `HEAD` equality with `--expected-head`.
4. Refuse an existing local `<branch>-done`.
5. Resolve the selected remote, normally `origin`, and inspect any upstream.
6. Verify the remote branch against `--expected-remote-head` or
   `--expect-new-remote-branch`.
7. Run `git fetch <remote>`.
8. Repeat the local `HEAD`, clean status, and exact remote expectation checks.
9. For a saved plan, atomically claim its attempt record.
10. Push with the exact destination and selected safe mode.
11. Run `git fetch <remote>` after push.
12. Require `git rev-list --left-right --count
    HEAD...refs/remotes/<remote>/<pushed-branch>` to be `0 0`.
13. Only after equality, rename the local branch to `<branch>-done`.
14. Report final status, canonical GitHub repository URL, existing PR or PR
    creation URL, and recommended tag.

The pushed branch name is captured before local rename and remains the source
for PR lookup and PR creation URLs.

## Safe Stops

Stop immediately without running later steps when:

- local `HEAD` differs from the reviewed SHA
- the worktree or index is dirty
- the current branch ends in `-done`
- the local `<branch>-done` already exists
- the remote cannot be resolved
- an existing remote branch differs from the reviewed remote SHA
- a reviewed-absent remote branch appears
- an existing remote branch has an upstream inconsistent with the push target
- fetch or push fails
- the local `HEAD` or clean status changes during apply
- the post-push comparison is not `0 0`

A push may already have succeeded when the post-push fetch or equality check
fails. In that case, report the failure and leave the local branch name
unchanged. Do not run `git pull` or infer a repair.

An upstream is optional for a new remote branch because `git push -u` creates
it. A new local work branch may still track its base branch before first
publication; the exact destination ref prevents that upstream from selecting
the push target.

## Completion Report and Boundaries

The helper returns stable JSON. A fixed `gh pr list --head <branch> --state open --limit 100 --json url` lookup failure is nonfatal: return
the deterministic PR creation URL and mark the existing-PR lookup unconfirmed.
A safely unresolved version or tag convention is also nonfatal and produces
`recommended_tag: "unresolved"`.

Every successful push completion report must include the recommended tag line,
even when resolution failed:

```text
推奨タグ名: <tag-or-未解決>
```

End the report with this exact handoff sentence:

```text
PRとタグはgithub上で操作してください。
```

Do not replace it with `PRとタグはまだ作成していません。` or another status-only
sentence. The helper returns the same text as `human_handoff`; use that field
without paraphrasing.

This workflow does not create, edit, or merge a Pull Request. It does not
create, move, delete, or push a tag. It does not create or publish a GitHub
Release, run `git pull`, stash or discard dirty changes, or open a browser.

## Tests

Run the isolated test suite with:

```sh
npm run test:miku-scm
```

The tests create temporary local repositories and local bare remotes. They do
not connect to or mutate a real remote repository. Git execution is injected
for failure-path tests covering fetch, push, post-push fetch, and equality
verification.
