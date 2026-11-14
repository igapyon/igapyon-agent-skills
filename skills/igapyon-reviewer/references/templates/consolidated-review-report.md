# Consolidated Review Report

Use this contract for all selected review lenses, including per-lens reports
when requested. It defines finding eligibility, status, format, and ordering.
When a lens says to use canonical fields, follow the selected format below;
the seven labeled fields are mandatory only in detailed format.

## Findings, Unchecked Scope, and Optional Suggestions

Choose where an observation belongs before assigning severity or status.

| Report as | Required basis | Severity |
| --- | --- | --- |
| Finding | Evidence of a defect, unmet requirement, or a concrete, explainable harm or risk | Critical / High / Medium / Low |
| Unchecked scope | Missing information or verification prevents a judgment about the target | None |
| Optional suggestion | The target already meets its purpose, but a relevant alternative may help | None |

A check the reviewer did not run is not itself a defect in the target. A
missing verification can be a finding when the target is required to provide
it: cite the requirement and explain the consequence of the gap. Do not invent
requirements merely to turn unchecked scope into a finding.

Actual harm or a failing reproduction need not have occurred. A supported
execution path, textual cue, or observable condition can establish a concrete
risk. Explain who or what is affected and under which condition. A generic
possibility of misunderstanding or failure is insufficient.

Use these statuses only for observations that qualify as findings:

- `confirmed`: evidence establishes the fact or mismatch being reported.
- `possible reading`: textual evidence supports the concern, but the effect
  on readers is inferred rather than observed.
- `residual risk`: observable conditions support a specific remaining risk;
  this is not a synonym for "not investigated."

Severity describes impact; status describes the basis and certainty. Assess
them separately. Do not automatically lower severity because a risk has not
yet occurred. Do not claim execution or reader testing that was not performed.

Report a matter once. Put material unchecked scope and useful optional
suggestions in assessment notes, without severity. Do not pad a review with
speculation, optional ideas, or repeated statements about the same gap.

## Format Selection

Follow the user's requested format. Otherwise use compact format for short
text or a narrowly scoped review; use detailed format for multi-file reviews,
complex issues requiring several pieces of evidence, audits, or release
readiness. Do not ask a question just to choose a format.

Format controls presentation, not investigation depth or which material
findings to report. Do not drop important evidence or risks to make a review
look short. Use the user's language for explanatory prose.

## Compact Format

For each finding, include severity, status, location and evidence, the issue,
its impact, and a suggested direction in a short paragraph or bullet. They do
not need separate labels. Name a lens only when it helps understanding.
Mention scope and verification when needed to assess the conclusion; put
material unchecked scope or optional suggestions in brief notes.

```text
- [Medium / possible reading] notice.md:12 — 「明日」の基準となる掲示日がなく、
  後日読む利用者は開始日を判断できません。日付を明示する方向が考えられます。

未確認: 外部リンクの到達性。
```

## Detailed Format

Use the following field names and order for each finding. Individual lenses
may add relevant assessment notes but must not redefine these finding fields.

```text
Review

Target: ...
Scope checked: ...
Verification performed: ...

Findings:
- Severity: Critical / High / Medium / Low
  Status: confirmed / possible reading / residual risk
  Lens: ...
  Location and evidence: ...
  Issue: ...
  Why it matters: ...
  Suggested direction: ...

Assessment notes:
- Not checked: ...
- Optional suggestions, when useful: ...
- Lens-specific status or rating, when material: ...
- Functions to preserve or context needed for assessment, when in scope: ...
```

## Shared Integration Rules

Omit an empty findings list in either format. When no material issue exists,
give one global no-material-issue statement and retain material scope limits.
Do not equate no findings with complete verification or guaranteed safety.

Use lens-specific ratings only as assessment notes. For example, an AI-text
naturalness rating of `High` describes reader impression, not finding severity.
It cannot replace a finding's severity, status, or evidence.

Order findings globally by severity. Within the same severity, place safety
and respect findings first. Merge duplicate root causes across lenses and cite
the strongest evidence once. Preserve useful expression functions in notes or
suggested directions when a revision could lose them.

Execution order is separate from report order: run safety and respect checks
first when required, then apply global severity ordering to the report.

## Detailed Multi-Lens Example

```text
Review

Target: README.md
Scope checked: safety and respect, writing style, public links
Verification performed: local text and relative links inspected; external URLs not fetched

Findings:
- Severity: High
  Status: confirmed
  Lens: public links
  Location and evidence: README.md:18, public service entry is http://localhost:3000/start
  Issue: The advertised entry points to the reader's own machine.
  Why it matters: Readers cannot reach the published service through this URL.
  Suggested direction: Use the actual public entry URL after confirming it.

- Severity: Medium
  Status: confirmed
  Lens: safety and respect; writing style
  Location and evidence: README.md:42, wording addresses the author rather than the behavior
  Issue: The criticism is unnecessarily personal.
  Why it matters: Readers may receive a technical correction as blame.
  Suggested direction: Describe the observable behavior and its impact.

Assessment notes:
- Not checked: reachability of other external URLs
```

The example illustrates ordering, duplicate-lens consolidation, and unchecked
scope without treating an unfetched URL as a defect. Its localhost finding is
supported by the visible URL and advertised purpose, not a network test.
Do not copy these findings into an unrelated review.
