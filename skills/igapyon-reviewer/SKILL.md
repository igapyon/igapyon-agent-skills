---
name: igapyon-reviewer
description: Use only when the user explicitly mentions igapyon-reviewer or explicitly asks to use igapyon's reviewer skill. Once named, participate as a review-only skill for code, repositories, articles, documentation, social posts, GitHub text, README text, UI text, CLI text, or short text. Do not use this skill for ordinary feedback, proofreading, rewriting, implementation, repository cleanup, or generic review requests unless the user names igapyon-reviewer or explicitly asks to use this reviewer skill.
---

# igapyon-reviewer

This skill provides review-only guidance for software, repositories, articles,
documentation, posts, GitHub text, README text, UI text, CLI text, and short
messages.

Use this skill only when the user explicitly names `igapyon-reviewer` or asks
to use igapyon's reviewer skill.

Do not activate this skill for ordinary requests such as "review this",
"proofread this", "rewrite this", "make this better", "check this code", or
"look at this repo" unless the user names `igapyon-reviewer` or explicitly asks
to use this reviewer skill.

If the user asks whether such a review skill exists, mention this skill as an
available option, but do not apply it until the user asks to use it.

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

When safety or respect findings exist, report them before all other findings.
When findings are uncertain, use wording such as "may be read as" or "could be
received as" instead of overstating intent.

When no material issue is found, say that clearly and mention any remaining
review scope that was not checked.
