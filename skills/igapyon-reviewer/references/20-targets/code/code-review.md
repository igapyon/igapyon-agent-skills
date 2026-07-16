# Code Review

Use this reference to review source-code changes or a defined code area for
correctness, regressions, failure handling, security/privacy risks, and test
evidence.

This is a code-quality review, not a completion or release judgment. Use
[Software Completion Review](../../30-timing/release/software-completion-review.md)
when the user asks whether a whole project is usable, complete, or releasable.

## Review Priority

Use this review when the target includes source code, a patch, a pull-request
diff, tests, configuration that changes runtime behavior, or an explicit code
review request.

Confirm the intended change and inspect the changed code first when a diff is
available. Read enough surrounding code, callers, tests, and configuration to
verify behavior rather than reviewing isolated lines only.

## Evidence and Scope

For each confirmed finding, identify the affected file and line and explain the
execution path, failing condition, or missing test that supports it. Run a
relevant existing test, build, lint, type check, or focused reproduction when
it is safe and proportionate. If a check was not run, say so.

Do not invent requirements, APIs, deployment behavior, or security properties.
When the intended behavior is unclear, report the ambiguity or request the
missing requirement instead of treating an assumption as a defect.

## Correctness and Regression Checks

Check whether the change:

- implements the stated behavior for normal and boundary inputs
- preserves behavior relied on by callers, public APIs, configuration, or data
  formats unless the change intentionally updates that contract
- handles null, empty, missing, malformed, duplicate, large, concurrent, or
  reordered input where those cases are relevant
- keeps state transitions, defaults, return values, and error paths consistent
- avoids off-by-one errors, inverted conditions, incomplete branches, and
  unintended fallthrough
- keeps asynchronous, retry, cache, transaction, or resource-lifecycle behavior
  safe when those mechanisms are present

## Failure Handling and Observability

Check whether failures are visible and recoverable at the appropriate layer.

- validate untrusted or external input before using it
- preserve useful error context without exposing secrets or private data
- avoid swallowing exceptions, ignoring error results, or continuing after a
  failed prerequisite
- release files, connections, locks, processes, and temporary resources on both
  success and failure paths
- keep logs, metrics, exit codes, and diagnostics consistent with the public
  contract when they are part of the behavior

## Security and Privacy Checks

Review security and privacy in proportion to the code's exposure and the
requested scope. Escalate findings when code crosses a trust boundary, handles
credentials or personal data, executes commands, constructs queries, writes
files, processes network input, or changes authorization behavior.

Check for visible risks such as missing authorization, unsafe interpolation,
injection-prone command/query construction, path traversal, insecure defaults,
overbroad data exposure, secret logging, and unbounded resource use. Do not
claim that code is secure merely because no issue is visible; state unreviewed
attack surfaces and recommend a dedicated security review when needed.

## Test Evidence Checks

Check whether tests or other verification cover the changed contract:

- primary success path and the failure or boundary case that defines the change
- a regression test for a fixed defect when practical
- public interfaces, serialization, migrations, and configuration when changed
- previously passing behavior likely to be affected by the change
- the documented command or CI path used to run the evidence

Do not require exhaustive tests for a small, low-risk change. Flag a gap when
the missing evidence leaves the changed behavior or a plausible regression
unverified.

## Severity Guidance

Use these severity levels:

- Critical: code can expose secrets or private data, bypass authorization, cause
  data loss or corruption, or enable a likely high-impact exploit.
- High: a normal or documented workflow is incorrect, crashes, silently loses
  data, or has a likely security boundary failure.
- Medium: a boundary case, error path, compatibility expectation, or regression
  risk is unsupported or lacks sufficient verification.
- Low: clarity, maintainability, diagnostic, or narrowly scoped test improvement
  would reduce future risk without changing current behavior.

## Review Output

Contribute findings to the
[Consolidated Review Report](../../templates/consolidated-review-report.md).
Do not emit a standalone `Code Review` section unless the user explicitly asks
for per-lens reports. Use the canonical fields for every finding. Express user
or system impact through the canonical `Why it matters` field.
