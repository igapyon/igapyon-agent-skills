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

When PR mode has no explicit target, resolve the same default base used by PR
Soft Reset Recommit. If the branch is two or more commits ahead of that base,
collect evidence from the complete `<base>..HEAD` range and mark recommit as
the preferred next workflow. Keep a branch that is exactly one commit ahead as
a single-commit PR. Explicit commits and ranges always override this default.
When the base cannot be resolved, preserve the bounded latest-single-commit
fallback and report that base resolution was unavailable.

A bare `recommit` request implicitly includes PR mode for exactly
`<base>..HEAD`; the user does not need to request PR writing separately. If a
matching saved draft does not exist, prepare evidence, draft and save the PR
text, and then enter recommit preflight. This implicit writing step does not
authorize the local history rewrite.

For the exact `miku-scm pr recommit push` request, first use READONLY
recommit preflight. When its sole blocker is a missing branch-matching draft,
prepare evidence for exactly the resolved `<base>..HEAD` range, draft once,
save only at `suggested_draft_path`, and then return to the fixed remote apply
workflow in the same turn. Other blockers prevent both drafting and mutation.

Release mode requires an explicit start commit or range. A single Release
start commit is inclusive through `HEAD`. About mode reads bounded repository
documents. Issue mode requires an exact `owner/repository`; it retrieves either
the exact existing Issue or the repository's existing labels through the fixed
Issue READONLY helper.

The evidence collector redacts lines that resemble common credential
assignments and bounds patch and document excerpts. Truncation is explicit.
The Agent must not treat mechanical file classification as confirmed intent or
impact.

For Git-based writing modes, collect diff statistics, changed paths, and the
bounded patch excerpt with `--no-textconv`. This keeps repository-configured
text renderers from changing evidence collection or causing a renderer-specific
failure. The fixed Git runner permits at most 64 MiB on each captured output
stream; it does not pass `--exit-code`, so an ordinary diff remains successful
while a genuine Git failure remains a stop.

Writing output never authorizes GitHub mutation. Validate and save the draft,
then enter the matching mechanical preflight and approval workflow.
