# Runtime And Observability

The GitHub Writer runtime is split into focused Node modules while preserving
`github-writer-kernel.mjs` as a small compatibility facade.

## Module Boundaries

- `github-writer-core.mjs`: hashing, path containment, atomic writes, repository
  identity, and the fixed local Git command allowlist.
- `github-writer-evidence.mjs`: PR, Release, About, and branch-status evidence.
- `github-writer-operations.mjs`: draft saving, sealed plans, attempt records,
  backup apply, and recommit apply.
- `github-writer-handoff.mjs`: immutable approval handoffs that retain exact
  apply arguments and the sealed apply-workflow contract.
- `github-writer-output.mjs`: stable success and failure envelopes plus human
  summaries.
- `github-writer-observability.mjs`: per-run request, result, and error-event
  records.
- `github-writer-run.mjs`: fixed CLI parsing, dispatch, and record orchestration.
- `github-writer-kernel.mjs`: compatibility exports only; do not add new logic.

Workflow contracts hash the runner, compatibility facade, core, exact workflow
implementation, output, observability, help contract, and manifest sources as
one ordered source set. A change in any of those sources invalidates old apply
plans and pending handoffs.

## Run Records

Successful execution writes:

```text
workplace/github-writer/runs/<run-id>/request.json
workplace/github-writer/runs/<run-id>/result.json
```

Failed execution also writes `error-event.json`. Paths returned in the result
are repository-relative. Absolute repository arguments and credential-like
values are redacted from `request.json`.

The runner determines the run context before execution but defers filesystem
writes until the workflow finishes. This prevents operational records from
appearing as untracked changes in the evidence being collected. Apply workflows
still write their dedicated attempt record immediately before local mutation.
For plan-state comparison, the runner also excludes only its own untracked
`workplace/github-writer/` or `temp/github-writer/` records. Every other staged,
modified, renamed, ignored, or untracked path remains part of repository-state
validation.

Help, `--list-workflows`, and failures that occur before a valid repository and
workflow context exists write no run directory.

## Approval Handoffs

A successful backup or recommit preflight writes one pending handoff under:

```text
workplace/github-writer/handoffs/<full-sha256>.json
```

It contains only local repository identity, the preflight's sealed plan path and
digest, exact apply arguments, and the apply-workflow contract pair SHA-256. The
Agent presents the handoff; a later explicit approval uses the fixed
`approval.handoff.apply --apply` workflow. It requires exactly one pending
handoff unless a full 64-character ID is supplied. State changes are atomic:
`pending` → `applying` → `applied`, `conflict`, `unresolved`, or `not-applied`.
No handoff retries an apply after a failure. A deliberate cancellation uses
`approval.handoff.dismiss --handoff <full-id> --apply`.

## Structured Failure

`github-writer.error/v2` records:

- stable code and phase
- classification
- mutation invocation state
- retryability
- recovery help command
- stable SHA-256 signature

Use the READONLY report command to group error events by signature:

```text
node skills/igapyon-github-writer/scripts/github-writer-error-report.mjs \
  --format human --repo <path>
```

The report skips malformed operational records and never repairs or deletes
them. It invokes no network client and performs no remote operation.

## Bounded Git Diagnostics And Benchmarking

Git output capture is capped at 64 MiB so large local diffs do not fail at
Node's default 1 MiB buffer. Evidence still returns bounded patch, file-list,
and diff-stat fields. Repository-specific external diff, text conversion, and
rename rendering are disabled for evidence. On a local Git failure, the runner
records only a bounded, redacted diagnostic plus output byte count and SHA-256;
it does not include the full command output.

`npm run benchmark:github-writer` creates an isolated local fixture and measures
three fixed-runner scenarios: mechanical (`branch.status`), writing
(`pr.evidence`), and approval (`pr.recommit.preflight`). Each reports cold
process and warm same-process min/p50/p95/max timings, failure rate, structured
and human-output bytes, runtime-reference count, null token metrics, fixed
workflow boundaries, and expected Agent/model participation. The default output
is saved under `workplace/github-writer/benchmarks/`; compare only the same
scenario on the same OS, architecture, Node major version, and Git version. Use
`--no-save` for an ephemeral report, or an optional `--max-warm-p50-ms <n>` as a
local regression gate; CI intentionally supplies no cross-platform threshold.
