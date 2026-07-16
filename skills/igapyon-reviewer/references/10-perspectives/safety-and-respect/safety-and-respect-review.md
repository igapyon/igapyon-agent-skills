# Safety and Respect Review

Use this reference as the first review lens for public, semi-public,
interpersonal, user-facing, or community-facing text.

This review checks whether the target text could reasonably make readers feel
attacked, excluded, stereotyped, misrepresented, exposed, or harmed. It also
checks for compliance-adjacent risks such as discrimination, harassment,
privacy issues, defamation risk, and human-rights concerns.

## Review Priority

Run this review before style, clarity, correctness, AI-text naturalness, or
technical quality review.

Report serious safety or respect concerns first, even when the text is otherwise
well written or technically correct.

Do not soften or hide a serious concern behind minor wording advice. If a risk
is uncertain, describe it as a possible reading rather than a confirmed problem.

## Scope

Check these surfaces when present:

- article drafts
- social posts
- README text
- GitHub PR descriptions
- release notes
- issue or discussion comments
- documentation aimed at users
- CLI messages, warnings, and errors
- product UI text
- community guidelines or contribution text
- short private messages when the user asks for review before sending

## Primary Checks

Look for these issues first:

- direct insults, mockery, contempt, or humiliating phrasing
- wording that blames a person or group rather than describing a behavior,
  event, artifact, or risk
- stereotypes or assumptions about nationality, ethnicity, race, gender,
  disability, age, religion, occupation, language ability, income, education,
  body, family status, or other personal attributes
- exclusionary language that implies a group does not belong
- dehumanizing, dismissive, or purity-test language
- harassment-like phrasing, dogpiling invitations, or public shaming
- threats, intimidation, or coercive wording
- private information, identifying details, secrets, internal facts, or
  sensitive personal context that may not be appropriate to publish
- claims about identifiable people or organizations that could be read as
  defamatory if unsupported
- excessive certainty about motives, character, competence, or intent
- wording that turns a technical disagreement into a judgment about the person
- jokes, irony, sarcasm, or exaggeration that could be misunderstood outside
  the original context
- phrases that may be acceptable in a private note but risky in public

## Human-Rights and Discrimination Checks

Treat these as high-priority findings:

- attributing ability, morality, intelligence, reliability, or behavior to a
  protected or personal attribute
- presenting a group as inferior, dangerous, abnormal, disposable, or less
  deserving of respect
- using slurs, coded insults, or historically hostile labels
- reducing people to a condition, origin, identity, or role
- denying dignity, agency, or equal participation to a group
- making broad negative claims about a group based on limited examples

Prefer wording that focuses on concrete behavior, observable facts, affected
systems, documented constraints, and the author's own experience.

## Gender Respect Checks

Check gender-related wording explicitly. Do not avoid every mention of gender.
Mentioning gender can be appropriate when it is relevant, factual, respectful,
and necessary for the topic. Flag it when the wording creates an avoidable
gender-based harm or exclusion.

Treat these as findings when present:

- assuming a person's role, ability, interest, emotion, responsibility, or
  behavior from gender
- using gender as an explanation when it is not relevant to the point
- presenting one gender as the default user, developer, reader, maintainer, or
  decision-maker without reason
- using wording that excludes women, men, non-binary people, or transgender
  people from a community or role
- making jokes or criticism that rely on gender stereotypes
- using marital, family, appearance, age, or body references differently by
  gender when they are not relevant
- deadnaming, misgendering, or unnecessary disclosure of gender identity when
  reviewing text about an identifiable person
- implying that care work, communication, technical ability, leadership, or
  emotional response belongs naturally to a specific gender

Prefer neutral role terms when gender is not relevant, such as `user`,
`reader`, `maintainer`, `developer`, `contributor`, `author`, `operator`, or
`person`.

Do not overcorrect legitimate context. For example, gender-specific wording may
be appropriate in a text about gender discrimination, survey demographics,
health, legal rights, historical context, or a person's self-described identity.
In those cases, review whether the wording is accurate, necessary, and
respectful.

## Privacy and Defamation Checks

Check whether the text exposes or implies:

- names, handles, workplace, school, location, contact details, or family
  information that are not necessary
- internal project details, private conversations, unpublished decisions, or
  confidential customer or contributor information
- accusations about illegal, unethical, malicious, discriminatory, or
  incompetent behavior without enough public evidence
- screenshots, logs, paths, IDs, or metadata that reveal more than intended

If the text needs to discuss a person, organization, or incident, prefer a
minimal factual description and avoid speculation about motive or character.

## Tone Risk Checks

Flag wording that is technically allowed but likely to be received poorly:

- "obviously", "clearly", "anyone can see", or similar phrases that shame the
  reader
- "just", "simply", or "basic" when they minimize another person's difficulty
- "wrong", "bad", "terrible", or "nonsense" when a more precise issue label is
  available
- "they do not understand" when the evidence only shows a mismatch or gap
- absolute claims such as "always", "never", "everyone", or "nobody" when the
  evidence is narrower
- jokes at the expense of a person, group, user, maintainer, or beginner

Prefer calm, precise wording that identifies the problem without attacking the
person.

## Severity Guidance

Use these severity levels:

- Critical: likely discrimination, harassment, privacy exposure, defamation, or
  human-rights harm if published as-is.
- High: strong risk that a reasonable reader or affected group would feel
  attacked, excluded, stereotyped, exposed, or publicly shamed.
- Medium: wording is unnecessarily harsh, dismissive, overgeneralized, or easy
  to misread in a public context.
- Low: minor tone or phrasing concern that could be made more considerate
  without changing the main message.

Do not overstate severity. A blunt but fair technical statement may be a tone
issue, not a safety issue.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Safety and Respect Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

Lens-specific notes and ratings never replace finding severity, status, or
location and evidence. When this lens finds no material issue, do not emit a
separate no-issue block; preserve checked scope, verification, and residual risk
in the consolidated assessment notes.

For short text, keep the review short. For article-length text, list only the
highest-signal findings first and avoid line-by-line nitpicking unless the user
asks for it.

## Rewrite Guidance

When suggesting safer wording:

- preserve the user's main point
- reduce attack, blame, stereotyping, and speculation
- replace character judgments with observable facts
- replace group generalizations with scoped statements
- remove unnecessary identifying details
- keep the wording natural rather than legalistic when possible

Do not rewrite the whole text unless the user asks for revision. In review mode,
provide targeted safer alternatives for the risky phrases.

## Useful Safer Patterns

Prefer these directions:

- "This behavior can cause..." instead of "They are..."
- "In this case, the implementation..." instead of "The developer..."
- "This may be read as..." instead of "This is offensive..."
- "The evidence in the text does not support..." instead of "That is false..."
- "Some readers may understand this as..." instead of "Everyone will think..."
- "A safer phrasing would be..." instead of "You must say..."

The goal is not to make all writing bland. The goal is to keep strong opinions,
technical criticism, and personal experience from becoming unnecessary harm.
