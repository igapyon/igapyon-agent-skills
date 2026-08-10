# PR Recommit Push

`pr.recommit.push` is the fixed remote-mutation transition behind the exact
user-facing command `miku-scm pr recommit push`. It is distinct from
`pr.recommit.apply`, which remains local-only.

## Invocation

After the one required PR-writing step has saved a reviewed draft, invoke the
fixed runner once:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  pr.recommit.push \
  --base origin/devel \
  --pr-draft workplace/miku-scm/pr-drafts/pr-<branch>-<timestamp>.md \
  --apply
```

`--base`, `--pr-draft`, and `--apply` are required. `--remote` defaults to
`origin`. The exact `push` token is the authorization boundary for the remote
mutation; `pr recommit` and bare `recommit` never imply it.

The command does not create or merge a Pull Request, create or move a tag, or
create a GitHub Release.

## One-shot Safety Sequence

The runner performs the following fixed sequence without a conversational
approval pause between successful steps:

1. Validate the base, branch, clean worktree, PR-draft containment and digest,
   and collapse range.
2. Read the destination branch on the selected remote and fix its exact state:
   absent, or one full remote SHA.
3. Create the local backup branch and verify it still points to the old HEAD.
4. Soft-reset to the verified base and create the PR-draft commit.
5. Re-read the remote destination while requiring the state fixed in step 2.
   A changed or newly appeared branch stops before push.
6. Save the verified publication plan, then consume its exact digest through
   the existing publication apply path. That path rechecks the expectation,
   uses a new-branch push or explicit `--force-with-lease`, records its attempt,
   fetches, verifies `0 0`, and only then renames the local branch to `-done`.

The backup-success boundary is intentionally inside this one invocation: no
second approval is requested after backup when the fixed state remains valid.

## Outcomes

- `published`: local recommit and publication both succeeded; the local branch
  is `<work-branch>-done` and the result contains PR/tag handoff information.
- `partial`: local recommit succeeded, but publication stopped before a remote
  mutation, for example because the destination branch changed. The work
  branch remains checked out as a candidate; inspect the reported backup,
  HEAD, and publication detail before a separately authorized recovery.
- `unresolved`: a mutation may have occurred but final state is not safely
  known. Do not retry automatically.
- `not-applied`: validation failed before backup creation.

## Platform Boundary

Current apply support is macOS only because it reuses the proven publication
contract. On `win32` and other platforms, `pr.recommit.push` stops before
backup creation and reports no mutation. This is deliberate: enabling Windows
publication requires the shared platform-adapter migration and Windows contract
tests described in the Work Cycle redesign; it is not a shell-script split.

`rg` is not required by this transition.

## Source-Maintenance Verification

When changing this workflow, run its focused test plus the miku-scm fast suite.
Before handoff, regenerate workflow contracts, check their drift, and run the
full miku-scm suite.
