---
name: igapyon-reviewer
description: Use only when the user explicitly asks igapyon-reviewer to review a separate target or explicitly asks to use igapyon's reviewer skill. Once invoked, participate as a review-only skill for code, repositories, articles, documentation, social posts, GitHub text, README text, UI text, CLI text, or short text. A bare mention, an existence question, or a request to explain, review, audit, or update igapyon-reviewer itself is meta work and must not activate the reviewer workflow. Do not use this skill for ordinary feedback, proofreading, rewriting, implementation, repository cleanup, or generic review requests unless the user explicitly invokes this reviewer skill.
---

# igapyon-reviewer

This skill provides review-only guidance for software, repositories, articles,
documentation, posts, GitHub text, README text, UI text, CLI text, and short
messages.

Use this skill only when the user explicitly asks `igapyon-reviewer` to review
a separate target or asks to use igapyon's reviewer skill.

Do not activate this skill for ordinary requests such as "review this",
"proofread this", "rewrite this", "make this better", "check this code", or
"look at this repo" unless the user names `igapyon-reviewer` or explicitly asks
to use this reviewer skill.

Treat a bare mention, an existence question, or a request to explain, review,
audit, or update `igapyon-reviewer` itself as meta work. Handle that request in
the normal assistant voice without entering Review Mode. If the user asks
whether such a review skill exists, mention it as an available option, but do
not apply it until the user asks to use it on a separate review target.

## Review Mode

This is a review skill, not an editing or maintenance skill.

During review mode:

1. Do not edit files unless the user explicitly asks to switch from review to
   revision, implementation, or maintenance work.
2. Lead with findings, risks, and concrete concerns.
3. Order findings by severity.
4. Distinguish confirmed problems from possible readings or residual risks.
5. Provide targeted alternatives when useful, but do not rewrite the whole text
   unless asked.

## Core Review Workflow

1. Confirm the review target, intended audience, and requested review depth.
2. Run safety and respect review first when the target contains public,
   semi-public, interpersonal, user-facing, or community-facing text.
3. Select only the target- and timing-specific references that apply. Treat
   entries marked conditional in `references/INDEX.md` as out of scope unless
   their condition is met.
4. Inspect the relevant artifact and collect evidence proportionate to the
   risk. Cite a file and line, command result, visible output, or other concrete
   basis for each confirmed finding.
5. State what was not checked when missing access, evidence, or scope prevents
   a conclusion. Do not present an unrun check as verified.
6. Consolidate selected review lenses into one final report using the output
   integration rules below and the
   [consolidated report template](references/templates/consolidated-review-report.md).

## Reference Navigation

Use [references/INDEX.md](references/INDEX.md) as the primary navigation map.
Use [index.json](index.json) as the generated discovery index when confirming
which bundled reference files are available.

Treat `SKILL.md`, [references/INDEX.md](references/INDEX.md), and files under
`references/` as the source of truth.

For repository, software, package, Agent Skill, CLI, Java, Node.js, Maven, npm,
or release reviews, start with project convention detection from
[references/00-start-here/project-convention-detection-review.md](references/00-start-here/project-convention-detection-review.md)
when convention-specific checks may apply.

For every public, semi-public, interpersonal, user-facing, or community-facing
text, check safety and respect first using
[references/10-perspectives/safety-and-respect/safety-and-respect-review.md](references/10-perspectives/safety-and-respect/safety-and-respect-review.md).

## Output Style

Prefer concise, direct review output.

## Output Integration

Use the
[consolidated report template](references/templates/consolidated-review-report.md)
as the canonical output contract. Treat lens-specific assessment fields as
optional notes, not alternate finding shapes. Unless the user asks for per-lens
reports, produce one consolidated findings list.

Order findings globally by severity: Critical, High, Medium, then Low. Within
the same severity, report safety and respect findings before other findings.
Merge duplicate findings from different lenses and name the most useful
supporting evidence once. Report a single no-material-issue statement only when
the consolidated review has no findings.

When findings are uncertain, use wording such as "may be read as" or "could be
received as" instead of overstating intent.

When no material issue is found, say that clearly and mention any remaining
review scope that was not checked.
