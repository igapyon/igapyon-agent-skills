# Deterministic Workflow Runner

Use `scripts/miku-scm-run.mjs` as the fixed entry point for migrated
`igapyon-miku-scm` workflows.

## Design Boundary

The runner maps one reviewed workflow ID to one existing static helper
implementation. It does not accept an executable, shell command, command
fragment, arbitrary environment variable, or pass-through option.

The Agent's responsibility is limited to:

1. selecting a documented workflow ID
2. supplying that workflow's fixed minimal options
3. returning the stable `human_output` unchanged, or using structured JSON
   fields only when a subsequent fixed step requires them

Repository resolution, validation, fixed command execution, digest checks,
attempt records, and postcondition checks remain inside tracked and tested
Node code.

Normal execution does not require the Agent to read this document or the
workflow's normative spec. The manifest's `runtime_references` is the complete
additional Markdown set after routing; an empty list means none.

## Initial Workflow Registry

The canonical machine-readable catalog is
`scripts/miku-scm-workflow-manifest.mjs`; see
[workflow-routing.md](workflow-routing.md).

| Workflow ID | Mutation level | Approval gate | Delegate |
| --- | --- | --- | --- |
| `repository.status` | READONLY | none | `miku-scm-local-snapshot.mjs` |
| `github.issue.read` | READONLY | none | `github-issue-read.mjs` |
| `github.read.batch` | READONLY | none | `miku-scm-github-readonly.mjs` |
| `github.issue.create.preflight` | READONLY | preflight | `github-issue-create.mjs` |
| `github.issue.create.apply` | remote | apply | `github-issue-create.mjs` |
| `github.issue.update.preflight` | READONLY | preflight | `github-issue-update.mjs` |
| `github.issue.update.apply` | remote | apply | `github-issue-update.mjs` |
| `github.issue.comment.preflight` | READONLY | preflight | `github-issue-comment.mjs` |
| `github.issue.comment.apply` | remote | apply | `github-issue-comment.mjs` |
| `github.issue.label.preflight` | READONLY | preflight | `github-issue-label-update.mjs` |
| `github.issue.label.apply` | remote | apply | `github-issue-label-update.mjs` |
| `github.issue.close.preflight` | READONLY | preflight | `github-issue-close.mjs` |
| `github.issue.close.apply` | remote | apply | `github-issue-close.mjs` |
| `github.issue.handoff.apply` | remote | apply | `miku-scm-handoff.mjs` |
| `repository.maintenance.diagnose` | READONLY | none | `repository-maintenance.mjs` |
| `repository.maintenance.plan` | READONLY plus operational artifact | preflight | `repository-maintenance.mjs` |
| `repository.maintenance.apply` | local | apply | `repository-maintenance.mjs` |
| `repository.post-merge.next-work` | local | apply | `post-merge-next-work.mjs` |
| `pr.publish.preflight` | READONLY plus operational artifact | preflight | `post-recommit-publish.mjs` |
| `pr.publish.apply` | remote | apply | `post-recommit-publish.mjs` |
| `pr.recommit.preflight` | READONLY | preflight | `pr-soft-reset-recommit-preflight.mjs` |
| `pr.recommit.apply` | local | apply | `pr-soft-reset-recommit-preflight.mjs` |
| `version.status` | READONLY | none | `miku-scm-version.mjs` |
| `version.increment.validate` | READONLY | preflight | `miku-scm-version.mjs` |
| `writing.issue.prepare` | READONLY | none | `miku-scm-writing-prepare.mjs` |
| `writing.pr.prepare` | READONLY | none | `miku-scm-writing-prepare.mjs` |
| `writing.release.prepare` | READONLY | none | `miku-scm-writing-prepare.mjs` |
| `writing.about.prepare` | READONLY | none | `miku-scm-writing-prepare.mjs` |

The preflight and apply IDs are deliberately separate. Selecting a preflight
workflow can never enable mutation by adding `--apply`. Selecting an apply
workflow still requires all reviewed digests enforced by its delegate.

Every request, plan, snapshot, attempt, success result, and failure result
records `workflow_contract`, `contract_version`, and
`contract_pair_sha256`. The generated contract lock supplies these values
without loading detailed Markdown at runtime. The pair SHA-256 is calculated
from the canonical workflow contract ID, contract version, runner SHA-256, and
normative-spec SHA-256. It identifies a known runner/spec pair; contract tests,
not hashes, prove behavior.

`repository.post-merge.next-work` has no separate preflight artifact because
the human's explicit merge report is its operation-specific approval. It still
requires both `--confirmed-merged` and `--apply`; the delegate revalidates the
clean frozen branch, refreshes the base, checks the recommended tag, creates
the next branch, and verifies exact `0 0` alignment in one invocation.

PR publication retains its two-part human boundary. Use
`pr.publish.preflight` with the reviewed full local commit SHA and
`--save-plan`. After the human says `ok push`, pass the returned plan path and
SHA-256 unchanged to `pr.publish.apply`. The apply workflow does not accept
ordinary publication arguments and cannot rebuild or broaden the plan.
Publication and repository-maintenance plans also record the apply workflow's
contract identity. Apply stops before mutation when the reviewed plan names an
older or different contract pair.

PR recommit keeps a READONLY inspection ID and a separate local apply ID.
`pr.recommit.apply` requires explicit `--base`, `--pr-draft`, and `--apply`
options so the runner cannot silently select a different reviewed range or
draft. In one delegate call it collects the evidence, revalidates branch,
HEAD, base ancestry, worktree/index state, and PR draft SHA-256, creates the
backup branch, performs the soft reset against the verified base commit,
recommits with the verified draft bytes, and reports the new HEAD. A
backup-creation failure leaves `mutation_invoked: false`; a later local
mutation failure is reported as unresolved and must be inspected rather than
retried blindly.

Version inspection and increment validation remain READONLY. Status may report
format candidates, but it never resolves repository policy from numeric shape
alone. Increment validation requires an explicit policy plus the required
timezone or Semantic Version level and returns proposed values without editing
them.

Issue mutation preflights also save an approval handoff. After the human
reviews the complete preflight and replies `miku-scm approve`, invoke
`github.issue.handoff.apply --apply`. It accepts no workflow ID, handoff ID, or
apply arguments from the Agent and stops unless exactly one pending Issue
handoff exists. See [approval-handoff.md](approval-handoff.md).

Writing prepare workflows collect bounded, versioned evidence and a fixed
writing contract in one READONLY runner call. They do not draft prose or
authorize mutation. See [writing-mode.md](writing-mode.md).

## Invocation

### Product version

Print the runner's product name and version without repository input, network
access, subprocesses, or artifact writes:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs --version
```

The output is one plain-text line containing only `<version>`, regardless of
the workflow output format default. The repository's root `pom.xml` is the
authoritative version source. The bundled runner carries the same value so an
installed Skill remains self-contained, and the test suite rejects drift
between the two.

### Help and machine-readable discovery

Help is a metadata-only path. The runner resolves it before creating a run
directory, parsing workflow options, calling a delegate, starting a subprocess,
or accessing the network. Both forms below are equivalent:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  help repository.status

node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  repository.status --help
```

List every workflow with its purpose, required flags, mutation level, approval
gate, network access, and detailed-help command:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  --list-workflows
```

Place an explicit format before the help or workflow selector. JSON help is a
versioned contract intended for Agent discovery:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  --format json help repository.status
```

Help and list output default to human text. Workflow execution defaults to
JSON. Workflow-scoped help must remain exit-zero and side-effect-free for every
manifest entry. It must not create the normal
`workplace/miku-scm/runs/<run-id>` audit directory.

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.read \
  --repo igapyon/igapyon-agent-skills \
  --issue 293
```

Use `--format human` before the workflow ID to print only the deterministic
human summary while retaining the complete JSON under the run directory:

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  --format human repository.status
```

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.create.preflight \
  --repo igapyon/igapyon-agent-skills \
  --draft workplace/miku-scm/new-issues/issue-new-202607272148.md \
  --label enhancement \
  --parent 292
```

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  repository.post-merge.next-work \
  --confirmed-merged \
  --apply
```

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  pr.publish.preflight \
  --expected-head <reviewed-full-sha> \
  --save-plan
```

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  pr.publish.apply \
  --apply-plan workplace/miku-scm/ok-push/<plan>.json \
  --expected-plan-sha256 <reviewed-sha256>
```

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  pr.recommit.preflight \
  --pr-draft workplace/miku-scm/pr-drafts/<draft>.md
```

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  pr.recommit.apply \
  --base origin/devel \
  --pr-draft workplace/miku-scm/pr-drafts/<draft>.md \
  --apply
```

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  version.increment.validate \
  --version-file pom.xml \
  --coupled-version-file skills/igapyon-mikuku-agent/references/VERSION.md \
  --policy miku-date-coupled \
  --timezone Asia/Tokyo \
  --validate-increment
```

After human approval, use `github.issue.create.apply` with the exact
`apply_arguments` returned by the preflight. The runner does not construct,
repair, or broaden those arguments.

Issue update, comment, label, and close use the same boundary: run the matching
`.preflight` ID, show its complete reviewed evidence, and after explicit human
approval pass the returned `apply_arguments` unchanged to the matching
`.apply` ID. Their helpers remain authoritative for exact GitHub snapshots,
conflict detection, attempt records, bounded READONLY verification, and
mutation non-retry. Every apply argument set also fixes the reviewed apply
workflow contract pair SHA-256.

## Run Artifacts

Each invocation creates:

```text
workplace/miku-scm/runs/<run-id>/
  request.json
  plan.json
  snapshot.json
  result.json
  attempt.json
```

`attempt.json` is present only for an apply workflow. It points to the
delegate's authoritative attempt record when one is returned; it does not
replace that record.

The schemas are versioned as `miku-scm.runner/v1` and
`miku-scm.runner-result/v1`. Absolute option values are not copied into
`request.json`, and credential-like options are redacted. Current workflows
do not accept credentials or authentication configuration.

Failures also create `error-event.json` under the run directory. See
[safety-cost-and-errors.md](safety-cost-and-errors.md).

## Compatibility

Existing helper commands remain supported and authoritative during migration.
The runner calls their exported parser and implementation directly, so their
fixed command arrays, approval boundaries, conflict checks, attempt records,
and no-retry behavior remain unchanged.

Add a workflow to the registry only with:

- one fixed workflow ID
- a documented mutation level and approval gate
- an existing or newly reviewed static implementation
- parser tests that reject unknown options
- contract tests for the exact allowed command surface
