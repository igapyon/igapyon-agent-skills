# Writing Mode

Writing mode limits generative AI to evidence-based public prose. Mechanical
target resolution, evidence collection, bounds, redaction, and draft-path
selection use fixed READONLY runner workflows:

- `writing.issue.prepare`
- `writing.pr.prepare`
- `writing.release.prepare`
- `writing.about.prepare`

Each workflow returns versioned evidence, its SHA-256 digest, completeness and
truncation fields, a mode-specific writing contract, and a suggested draft
path. The Agent drafts once from that result and the user's direction. It does
not run an automatic second drafting pass or a separate AI review.

PR mode defaults to the latest single commit when no target is supplied.
Release mode requires an explicit start commit or range. A single Release
start commit is inclusive through `HEAD`. About mode reads bounded repository
documents. Issue mode requires an exact `owner/repository`; it retrieves either
the exact existing Issue or the repository's existing labels through the fixed
Issue READONLY helper.

The evidence collector redacts lines that resemble common credential
assignments and bounds patch and document excerpts. Truncation is explicit.
The Agent must not treat mechanical file classification as confirmed intent or
impact.

Writing output never authorizes GitHub mutation. Validate and save the draft,
then enter the matching mechanical preflight and approval workflow.
