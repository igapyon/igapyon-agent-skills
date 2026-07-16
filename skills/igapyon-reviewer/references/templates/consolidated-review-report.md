# Consolidated Review Report

Use this template for the final response unless the user explicitly requests
separate reports for each review lens. Include only fields supported by the
reviewed evidence.

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
- Lens-specific status or rating, when material: ...
```

Omit `Findings` when no material issue exists. In that case, give one global
no-material-issue statement and retain checked scope, verification, and
material residual risk under `Assessment notes`.

Use lens-specific ratings only as assessment notes. For example, an AI-text
naturalness rating of `Low`, `Medium`, or `High` describes reader impression;
it is not a finding severity. Never let a lens-specific rating replace
`Severity`, `Status`, or `Location and evidence` for a finding.

Order findings globally by severity. Within the same severity, place safety
and respect findings first. Merge duplicate root causes across lenses and cite
the strongest evidence once.

## Multi-Lens Example

```text
Review

Target: README.md
Scope checked: safety and respect, writing style, public links
Verification performed: local text and relative links inspected; external URLs not fetched

Findings:
- Severity: Medium
  Status: confirmed
  Lens: safety and respect; writing style
  Location and evidence: README.md:42, wording addresses the author rather than the behavior
  Issue: The criticism is unnecessarily personal.
  Why it matters: Readers may receive a technical correction as blame.
  Suggested direction: Describe the observable behavior and its impact.

- Severity: Low
  Status: residual risk
  Lens: public links
  Location and evidence: README.md:18, external URL was visible but not fetched
  Issue: External reachability was not verified.
  Why it matters: The link may have changed outside the reviewed artifact.
  Suggested direction: Verify the URL when network checking is authorized.

Assessment notes:
- Not checked: external URL reachability
```

The example demonstrates global severity order, duplicate-lens consolidation,
evidence, and an explicit unverified scope. Do not copy its findings into an
unrelated review.
