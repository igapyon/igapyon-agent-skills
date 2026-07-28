# Deterministic GitHub Writer Runner

The normal execution path is the independent Node runner:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json <workflow> [options]
```

It imports no `igapyon-miku-scm` runtime. It accepts only fixed workflow IDs and
fixed options, invokes Git with argument arrays and `shell:false`, and never
pushes, creates or merges a PR, publishes a release, or changes a remote.

## Fixed Workflows

| Workflow | Purpose | Mutation | Gate |
| --- | --- | --- | --- |
| `pr.evidence` | Bounded evidence for one commit or explicit range | none | none |
| `release.evidence` | Bounded evidence for a start commit or range | none | none |
| `about.evidence` | Bounded repository documents | none | none |
| `draft.validate-and-save` | Validate and save inner Markdown | operational file only | none |
| `branch.status` | Local branch, upstream, commits, and tags | none | none |
| `backup.preflight` | Seal repository state and proposed backup | plan file only | preflight |
| `backup.apply` | Create the sealed local backup branch | local Git | apply |
| `pr.recommit.preflight` | Seal base, draft digest, backup, and commit range | plan file only | preflight |
| `pr.recommit.apply` | Consume the plan once and recommit | local Git | apply |

## Common Commands

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json pr.evidence
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json pr.evidence --target <commit-or-range>
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json release.evidence --target <start-or-range>
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json about.evidence
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json branch.status
```

`--repo <path>` is accepted by every workflow. `about.evidence` accepts repeated
`--document <repository-relative-path>` options. Use `--format human` only for a
short user-facing report; use JSON when the result will feed a writing pass.

After writing an inner Markdown draft to a repository-relative input file:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json draft.validate-and-save --mode pr --input <relative-path>
```

Modes are `pr`, `release`, and `about`. The runner normalizes CRLF to LF,
validates length and sensitive-looking lines, saves under the normal operational
directory, and refuses to overwrite an existing file.

## Apply Contract

Preflight writes an immutable JSON plan and returns `plan_path` and
`plan_sha256`. Show the plan outcome before local Git mutation. Apply must receive
both values:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json backup.apply --plan <plan_path> --expected-plan-sha256 <plan_sha256>
```

Apply verifies repository identity, branch, `HEAD`, status digest, plan digest,
and workflow. Each plan can be attempted only once. The pending and result
records are retained under the operational directory. Do not retry a failed
apply; inspect repository state and create a new preflight.

Result envelopes use `github-writer.runner-result/v1`. Check `status`,
`mutation_invoked`, `error.classification`, and `error.retryability`. An
`UNCONFIRMED` result means a local Git command was invoked and the repository
must be inspected before any next action.

## macOS and Windows 11

- Node.js and Git must be available on `PATH`.
- No POSIX shell, PowerShell, or `cmd.exe` syntax is part of the runner contract.
- Paths are passed as process arguments, including spaces and Japanese text.
- Windows drive-letter matching is case-insensitive; repository containment also
  supports UNC paths.
- CRLF draft input is canonicalized to LF before digesting and saving.
- Operational files use atomic create-and-rename and unique names; no overwrite
  or rename-over-existing behavior is required.
- Automated contract tests run on macOS and Windows hosts. Real Windows 11
  acceptance should additionally exercise a path containing spaces and Japanese
  text, CRLF input, backup apply, and recommit apply.

Run the local contract suite with:

```text
npm run test:github-writer
```

The CI matrix also runs `npm run benchmark:github-writer`. It records the same
warm-process `branch.status` benchmark separately on macOS and Windows without a
shared hard threshold. Compare a platform only with its own prior baseline.
