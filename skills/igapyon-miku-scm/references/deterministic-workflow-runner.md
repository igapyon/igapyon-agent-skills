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
3. explaining the stable JSON result

Repository resolution, validation, fixed command execution, digest checks,
attempt records, and postcondition checks remain inside tracked and tested
Node code.

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
| `repository.maintenance.diagnose` | READONLY | none | `repository-maintenance.mjs` |
| `repository.maintenance.plan` | READONLY plus operational artifact | preflight | `repository-maintenance.mjs` |
| `repository.maintenance.apply` | local | apply | `repository-maintenance.mjs` |

The preflight and apply IDs are deliberately separate. Selecting a preflight
workflow can never enable mutation by adding `--apply`. Selecting an apply
workflow still requires all reviewed digests enforced by its delegate.

## Invocation

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.read \
  --repo igapyon/igapyon-agent-skills \
  --issue 293
```

```sh
node skills/igapyon-miku-scm/scripts/miku-scm-run.mjs \
  github.issue.create.preflight \
  --repo igapyon/igapyon-agent-skills \
  --draft workplace/miku-scm/new-issues/issue-new-202607272148.md \
  --label enhancement \
  --parent 292
```

After human approval, use `github.issue.create.apply` with the exact
`apply_arguments` returned by the preflight. The runner does not construct,
repair, or broaden those arguments.

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
