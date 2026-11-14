# Writing Style Review

Use this reference to review ordinary article, documentation, README, GitHub,
social post, and short-text writing style.

Review style against the user's instructions and the target's purpose. Apply
igapyon's default only when the style has not otherwise been established.

## Review Priority

Use this review after safety and respect review. Use it together with AI text
naturalness review when the user asks whether text feels generated, too generic,
or unlike the writer's voice.

For fitness for the reader's purpose or the effects of a stylistic change, use
[Reader Goals and Expression Review](expression-function-review.md). Establish
what the reader should gain and identify what a change would improve or lose.
A typo-only pass does not require the additional lens.

## Style Precedence

Determine the intended style in this order:

1. The user's explicit style or editing instructions.
2. The style already established in the target, supported expression intent,
   and the publication surface's requirements.
3. Only if still undecided and the target is igapyon writing, the default
   Japanese polite style, normally `です・ます調`.

Do not apply igapyon's default to another author's writing. An existing
consistent `だ・である調` does not need an explicit exemption to be preserved.
Use textual cues to explain a style's function without claiming to know the
author's intent. When established style and a surface requirement conflict,
explain the mismatch and its consequence rather than silently imposing a
default.

## Style and Consistency Checks

Flag style issues when:

- a shift conflicts with the selected style and obscures the speaker, sequence,
  or intended meaning
- mixed polite and plain styles cause a specific loss of clarity or coherence
- endings shift between stiff technical prose and casual speech in a way that
  distracts from the content
- wording makes criticism unnecessarily personal or harsh in context; plain
  endings alone are not evidence of disrespect

Do not require every line to end with `です` or `ます`. Natural variation is
allowed.

## Variation to Assess in Context

These parts may naturally differ from surrounding prose. Assess their function
instead of treating them as exceptions to a universal polite-style rule:

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
- specifications written consistently in `である調`
- dialogue, changes of narrator, or deliberate scene transitions

For bullet lists, either sentence style or fragment style is acceptable as long
as the list is internally consistent and easy to scan.

## Consistency Checks

Check these points:

- the chosen style matches the publication surface
- main explanatory paragraphs follow the selected style, with useful variation
- bullet lists do not fight the surrounding prose
- title and headings are concise without forcing polite endings
- technical terms and commands are not made awkward by over-politeness
- strong criticism remains scoped and respectful in the selected style

## Soft Assertion and Non-Harsh Tone Checks

Use these checks as a reviewer-friendly subset of the `みくく` writing rules.
Do not import the character voice itself or override the style precedence
above. The goal is careful, scoped criticism that still says important things
clearly; do not soften a passage merely because it uses plain style.

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
