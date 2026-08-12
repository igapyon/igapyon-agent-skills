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
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --version
```

`--version`, `--help`, `--list-workflows`, and `help <workflow>` are metadata
only: they do not invoke Git or create operational records. The generated help
comes from the same manifest that enforces accepted flags, repeated options,
required options, choices, defaults, mutation level, approval gate, and
workflow-specific human-output contract. Parse errors have stable error codes
and a matching help command.

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
| `approval.handoff.list` | List pending sealed approvals | none | none |
| `approval.handoff.apply` | Consume one approved handoff exactly once | local Git | explicit `--apply` |
| `approval.handoff.dismiss` | Cancel one pending handoff | operational file only | explicit `--apply` |

## Workflow Bundle Contract

Treat every fixed workflow as one versioned bundle. A workflow is incomplete
unless all of these parts exist and agree:

1. one entry in `scripts/github-writer-workflow-manifest.mjs` defining the
   workflow ID, accepted options, required parameters, mutation level, approval
   gate, executable allowlist, references, and exact contract test
2. one fixed runner entry plus every shared runtime source named by the
   manifest's `contract_sources`
3. one human-maintained normative Markdown specification, selected as the
   workflow's first manifest reference
4. one contract test that exercises the workflow's normal path, safety stops,
   and mutation boundary
5. one generated record in
   `scripts/github-writer-workflow-contract-lock.mjs` and the matching row in
   `references/workflow-contracts.md`
6. one stable result envelope and, for executed workflows, the documented run
   records

The manifest is the routing and interface source of truth. The normative
Markdown explains intent, evidence limits, approval semantics, side effects,
and recovery. The runner implements those rules. The test proves the contract.
The generated lock binds their exact content. Do not copy detailed commands or
mode rules into `SKILL.md`; keep it as the concise router to this bundle.

The Agent may select a workflow and, in writing modes, compose one prose draft
from bounded evidence. All deterministic Git decisions, output shaping, state
transitions, plan digests, and approval routing belong to the fixed runner. The
Agent must not reconstruct the runner's Git sequence, relax an approval gate,
reinterpret an apply result, or continue past an unresolved mutation. This
division keeps judgment in the Agent and repeatable mechanics in the fixed
runner.

### Bundle Change Procedure

Change a workflow as one unit:

Keep unimplemented behavior in the repository `TODO.md`. A normative Markdown
change and its matching runner and contract test must land in the same
implementation slice; never make the active Skill promise planned behavior.

1. update the normative Markdown before or together with behavior changes
2. update the runner and manifest without adding free-form command pass-through
3. add or update the exact contract test, including macOS and Windows-relevant
   path, newline, and process behavior where applicable
4. regenerate the lock and generated contract table with
   `node scripts/github-writer-workflow-contracts.mjs`
5. regenerate the Skill index when a tracked Skill file changed
6. run the focused tests, the full `npm run test:github-writer` suite, and
   `node scripts/github-writer-workflow-contracts.mjs --check`
7. review the final tracked diff; never hand-edit either generated contract
   artifact

Changing any locked runner source, normative specification, or contract test
changes the workflow pair SHA-256. Existing apply plans sealed with the prior
pair must then fail closed and require a new preflight. A documentation-only
change outside the selected normative specification does not silently alter an
existing apply plan.

### New Workflow Acceptance

Add a fixed workflow when the operation is repeated, mechanically decidable,
cross-platform-sensitive, or costly to perform incorrectly. Before accepting a
new workflow, require all of the following:

- a bounded input grammar and exact help contract
- an explicit mutation level and approval gate
- fixed command arrays with no shell or arbitrary executable pass-through
- deterministic success, safe-stop, conflict, and unresolved outcomes
- postconditions strong enough to decide whether another step may continue
- bounded output that does not expose large diffs, secrets, or absolute paths
- a normative specification and contract test linked from the manifest
- generated contract lock coverage and per-run observability

If these conditions cannot yet be stated precisely, keep the operation outside
the fixed workflow catalog until its boundary is resolved.

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
`plan_sha256`. It also writes a pending approval handoff containing those exact
values, the selected apply workflow, repository identity, and the apply-workflow
contract pair SHA-256. Show the `READY FOR APPROVAL` result before local Git
mutation. A later explicit approval consumes the handoff; it never rebuilds
apply arguments from model text:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json approval.handoff.apply --apply
```

When several requests are pending, first list them and then select exactly one
full handoff ID:

```text
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json approval.handoff.list
node skills/igapyon-github-writer/scripts/github-writer-run.mjs --format json approval.handoff.apply --handoff <full-sha256> --apply
```

Apply verifies repository identity, branch, `HEAD`, status digest, plan digest,
and workflow contract. Each plan and each handoff can be attempted only once.
The pending and result records are retained under the operational directory. Do
not retry a failed apply; inspect repository state and create a new preflight.
Dismiss a pending request, without mutation, only with
`approval.handoff.dismiss --handoff <full-sha256> --apply`.

JSON result envelopes use `github-writer.runner-result/v1`; fixed human output
uses `github-writer.human-output/v1`. Check `status`, `mutation_invoked`,
`error.code`, `error.classification`, and `error.retryability`. Human outcomes
start with exactly one of `SUCCESS`, `READY FOR APPROVAL`, `NOT APPLIED`,
`CONFLICT`, or `UNRESOLVED`. An `UNRESOLVED` result means a local Git command was
invoked and the repository must be inspected before any next action.

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
- Operational files use atomic create-and-rename for new records and atomic
  replacement for a documented state transition; handoff IDs are full SHA-256
  values and never use abbreviated matching.
- Automated contract tests run on macOS and Windows hosts. Real Windows 11
  acceptance should additionally exercise a path containing spaces and Japanese
  text, CRLF input, backup apply, and recommit apply.

Run the local contract suite with:

```text
npm run test:github-writer
```

The CI matrix also runs `npm run benchmark:github-writer`. It records cold and
warm timings for the mechanical, writing, and approval scenarios separately on
macOS and Windows without a shared hard threshold. The benchmark includes normal
run-record writes and reports expected Agent/model participation. Compare a
platform only with its own prior baseline.
