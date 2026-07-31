# Deterministic GitHub Writer Runner

The normal execution path is the independent Node runner:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json <workflow> [options]
```

It imports no `igapyon-miku-scm` runtime. It accepts only fixed workflow IDs and
the options declared in the workflow manifest, invokes local Git with argument
arrays and `shell:false`, never invokes `gh`, and performs no network access or
remote mutation.

Inspect the machine-readable workflow catalog and exact workflow help without
executing Git or writing artifacts:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json --list-workflows
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json help <workflow>
```

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

Every result also records the workflow contract ID, version, and pair SHA-256.
Apply plans seal the apply workflow's current pair SHA-256 and are rejected when
the runner, normative specification, or contract test has changed. Regenerate
and verify the tracked lock and table with:

```text
node skills/igapyon-github-writer/scripts/github-writer-workflow-contracts.mjs
node skills/igapyon-github-writer/scripts/github-writer-workflow-contracts.mjs --check
```

## Run Records And Errors

Workflow execution returns relative `run_artifacts` paths and writes the
following operational records after the workflow finishes:

```text
workplace/github-writer/runs/<run-id>/
  request.json
  result.json
  error-event.json
```

`error-event.json` is present only for a failed workflow that reached execution
context creation. Help, workflow listing, and parse failures remain
metadata-only and write no records. Deferring the write until after execution
prevents the audit record itself from changing local Git evidence. Apply
workflows retain their separate pre-mutation attempt records.

Group recorded failures by stable signature with:

```text
node skills/igapyon-github-writer/scripts/github-writer-error-report.mjs --format json --repo <path>
```

See [runtime-and-observability.md](runtime-and-observability.md).

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
shared hard threshold. The benchmark includes normal run-record writes. Compare
a platform only with its own prior baseline.
