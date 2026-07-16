# Writing Style Review

Use this reference to review ordinary article, documentation, README, GitHub,
social post, and short-text writing style.

By default, igapyon writing should use Japanese polite style, normally
`です・ます調`, unless the user explicitly asks for another style or the target
surface clearly requires another convention.

## Review Priority

Use this review after safety and respect review. Use it together with AI text
naturalness review when the user asks whether text feels generated, too generic,
or unlike the writer's voice.

## Default Style Check

When reviewing Japanese prose, first check whether the main body uses
`です・ます調` consistently.

Flag style issues when:

- the main body unexpectedly switches to plain style such as `だ・である調`
- polite and plain styles are mixed without a clear reason
- endings shift between stiff technical prose and casual speech in a way that
  distracts from the content
- a public article, README, release text, or explanatory post becomes more
  blunt than intended because of plain-style endings

Do not require every line to end with `です` or `ます`. Natural variation is
allowed.

## Allowed Exceptions

These parts may use forms other than `です・ます調` when natural:

- headings and section titles
- bullet fragments
- table cells
- command descriptions
- labels, UI text, CLI messages, and field names
- code comments and code blocks
- quoted text
- release-note fragments
- compact checklists
- titles where noun endings are more natural
- intentionally formal specifications where `である調` is explicitly requested

For bullet lists, either sentence style or fragment style is acceptable as long
as the list is internally consistent and easy to scan.

## Consistency Checks

Check these points:

- the chosen style matches the publication surface
- main explanatory paragraphs are mostly `です・ます調`
- bullet lists do not fight the surrounding prose
- title and headings are concise without forcing polite endings
- technical terms and commands are not made awkward by over-politeness
- strong criticism remains calm and respectful in polite style

## Soft Assertion and Non-Harsh Tone Checks

Use these checks as a reviewer-friendly subset of the `みくく` writing rules.
Do not import the character voice itself. The goal is to keep igapyon writing
polite, careful, and not unnecessarily sharp while still saying important
things clearly.

Check whether the text:

- avoids unnecessary overstatement
- uses qualification when the evidence is incomplete
- distinguishes confirmed facts from inference, opinion, or expectation
- says important conclusions clearly without pretending uncertain things are
  certain
- avoids making the reader, user, maintainer, or author feel blamed
- softens strong criticism with a concrete reason or scope
- avoids harsh, aggressive, or emotionless wording
- leaves room for alternate interpretations when appropriate
- uses phrases such as `かもしれません`, `と考えられます`, `この範囲では`,
  `現時点では`, or `少なくとも` when they make the claim more accurate

Flag tone issues when:

- a claim is stronger than the available evidence
- the text sounds like it is judging a person instead of a behavior, artifact,
  implementation, document, or risk
- a correction or review comment is technically right but likely to feel
  needlessly severe
- uncertainty is hidden to make the writing sound cleaner
- a broad conclusion is drawn from a narrow observation

Do not weaken technical correctness. If something is clearly broken, unsafe, or
unsupported, say so. The preferred style is calm and scoped, not vague.

Useful directions:

- "This is wrong" -> "This does not match the documented behavior."
- "The implementation is bad" -> "This implementation makes the failure mode
  hard to see."
- "Everyone will misunderstand this" -> "Some readers may read this as..."
- "This proves..." -> "This suggests..." when the evidence is partial.
- "You should..." -> "A safer direction is..." when giving review advice.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Writing Style Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

Do not rewrite the whole text unless the user asks for revision. In review
mode, point to style drift and suggest the smallest useful correction.
