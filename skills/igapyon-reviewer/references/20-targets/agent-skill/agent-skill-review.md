# Agent Skill Review

Use this reference to review igapyon-managed Agent Skills.

This review checks whether an Agent Skill is narrowly activated, maintainable,
discoverable, packageable, and easy for agents to use without loading too much
context at once.

## Review Priority

Use this review when the target is an Agent Skill directory, skill bundle,
skill design, `SKILL.md`, bundled references, assets, helper files, or runtime
integration.

Use it together with:

- [agent-skill-cli-integration-review.md](./agent-skill-cli-integration-review.md)
  when the skill bundles or calls a CLI, jar, Node `.mjs`, helper command, or
  external runtime
- [read-only-skill-content-format-review.md](./read-only-skill-content-format-review.md)
  when a read-only or reference-only skill must choose whether bundled knowledge
  should live in Markdown, JSON, JSONL, XML, templates, or generated indexes
- [archive-package-contents-review.md](../artifacts/archive-package-contents-review.md) when
  reviewing installable skill bundles or release zips
- [generated-artifact-review.md](../artifacts/generated-artifact-review.md) when checking
  generated indexes or other generated files

For new or updated miku-soft style Agent Skills, consult sibling skills or
sibling product repositories when they provide a safer or more efficient
pattern. If the relevant sibling source or artifact is not locally available,
ask the human to provide or fetch it when the reference would materially improve
the review.

## Activation Philosophy

igapyon-managed Agent Skills should generally be difficult to activate
accidentally.

The default design preference is opt-in activation. A skill should normally
start only when the user explicitly names the skill, explicitly asks to use that
skill, or asks for a workflow that is clearly and narrowly owned by that skill.

This is especially important for skills that express personal style,
repository conventions, release policy, character voice, review policy,
publication workflow, or miku-soft / igapyon-specific assumptions. These skills
can be very useful when intentionally selected, but they should not silently
override ordinary coding, writing, review, or repository work.

Broad activation is allowed only when the skill is intentionally a broad,
general-purpose capability and the description says that clearly. If the skill
contains igapyon-specific preferences, miku-soft conventions, or strong
workflow assumptions, broad activation should be treated as a risk.

Good activation wording usually includes:

- `Use only when the user explicitly names ...`
- `Use only when the user explicitly asks to use ...`
- `If the user only asks whether such a skill exists, mention it but do not
  apply it until asked.`
- clear exclusions for adjacent generic requests that should not trigger the
  skill

Avoid activation wording that triggers on broad domains alone, such as any
mention of Java, Node.js, Markdown, README, repository, review, article,
release, music, or writing, unless the skill is truly intended to own that whole
domain.

## Activation Checks

Check whether:

- `SKILL.md` front matter has `name` and `description`
- the description is narrow enough to avoid accidental activation
- the description says "Use only when..." when the skill should be opt-in
- ordinary adjacent tasks do not trigger the skill unintentionally
- "If the user only asks whether such a skill exists..." behavior is documented
  when relevant
- the body repeats important activation boundaries clearly

For igapyon skills, prefer explicit naming or explicit "use this skill" style
activation unless the skill is intentionally broad.

## `SKILL.md` Size and Role Checks

igapyon-managed Agent Skills should keep `SKILL.md` lean.

Use [refactoring-need-review.md](../../10-perspectives/maintenance/refactoring-need-review.md) when a skill has
grown by repeated additions and the main question is whether to pause and
reorganize `SKILL.md`, `references/`, templates, generated indexes, or bundle
structure.

Check whether `SKILL.md`:

- acts as a concise entrypoint
- explains activation, core workflow, reference selection, and verification
- points to `references/` for detailed rules, examples, long workflows,
  templates, checklists, or domain knowledge
- avoids becoming a large rulebook
- avoids duplicating detailed content already present in references
- keeps reference navigation clear enough that agents know what to read next

Flag issues when detailed review rules, domain knowledge, examples, or long
procedures are copied into `SKILL.md` instead of being placed under
`references/`.

## `index.json` Checks

For igapyon-managed Agent Skills, `index.json` is required.

Check whether:

- the skill directory contains `index.json`
- `index.json` is generated from current files, normally by `miku-indexgen`
- `miku-indexgen` is configured to scan the intended skill files and does not
  miss important `references/`, templates, assets, helper files, or metadata
- `SKILL.md` explicitly says to use `index.json` as a discovery index when
  confirming bundled reference files, assets, or helper files
- `SKILL.md` treats itself and files under `references/` as the source of truth
- newly added, removed, or renamed references are reflected in `index.json`
- entries contain meaningful discovery information, such as useful `name`,
  `path`, `ext`, directory, size, and a summary that helps agents decide whether
  to open the file
- Markdown files have clear titles or first headings so generated summaries are
  meaningful rather than generic or misleading
- `index.json` does not contain local absolute paths, placeholders, or
  unrelated files
- `index.json` is not merely present; it is useful for choosing the next
  reference without opening every file
- installable bundles include `index.json`

## Reference and Asset Checks

Check whether:

- long rules and examples live under `references/`
- reference file names are specific and stable
- `SKILL.md` links directly to important references
- reference files under `references/` are reachable from `SKILL.md` directly,
  through `index.json`, or through an intermediate index Markdown file such as
  `references/INDEX.md`
- deeply nested references are avoided unless the structure is justified
- reusable templates live under `references/templates/` when concrete examples,
  output skeletons, prompt fragments, checklist formats, article sections,
  issue bodies, release text, or generated-file shapes should be copied or
  adapted
- behavior that becomes stable only with examples includes appropriate examples
  in `references/` or `references/templates/`
- examples that are meant only for reading are clearly separated from templates
  that are meant to be reused
- skill-local references use paths inside the same skill directory
- the skill does not reach into another skill by relative paths such as
  `../other-skill/...`
- assets are stored under `assets/` when they are output resources rather than
  context to read
- helper scripts or runtime files are stored in predictable skill-local paths
- bundled files are necessary for the skill's actual use

## Reference-Only Agent Skill Checks

For Agent Skills that do not bundle an MCP server, CLI runtime, Java jar, Node
`.mjs`, helper command, or other executable tool, classify them as
`reference-only` skills. These are information-pack or knowledge-pack style
skills: their main value is bundled instructions, references, examples,
templates, domain notes, review criteria, or writing guidance.

For reference-only skills, `index.json` is still useful as a generated file
inventory, but it may not be enough when the skill contains many references.
When there are many reference files, nested folders, or multiple subdomains,
check whether there is an intermediate summary or navigation Markdown file.

Use [read-only-skill-content-format-review.md](./read-only-skill-content-format-review.md)
when the main question is whether the skill's bundled knowledge should be stored
as Markdown, JSON, JSONL, XML, templates, generated `index.json`, or converted
source documents.

Common names for this intermediate file include:

- `references/INDEX.md`
- `references/SUMMARY.md`
- `references/README.md`
- a domain-specific overview such as `references/review-map.md`

Check whether the intermediate summary:

- is reachable from `SKILL.md` directly or through `index.json`
- explains the major reference groups and when to read each one
- summarizes enough information that an agent can choose the right detailed
  reference without loading every file
- stays current when references are added, removed, renamed, or regrouped
- links to templates under `references/templates/` when templates exist
- does not duplicate all detailed rules from child references

Flag issues when:

- a reference-only skill has many references but no human-readable overview or
  summary Markdown
- `index.json` exists but only lists files and does not help agents decide what
  to read next
- references are organized into several subdomains but no map explains the
  relationship
- the overview is stale compared with `index.json` or the actual references

Do not require an intermediate summary for a very small skill with only a few
obvious reference files. Require it when reference selection itself becomes a
source of context cost or agent error.

## Sibling Skill and Product Checks

For miku-soft and nearby Agent Skills, check whether related skills or sibling
product repositories should be used as references.

Actively compare against sibling sources when they can clarify:

- activation wording
- `SKILL.md` lean entrypoint shape
- `index.json` handling
- reference organization
- template placement
- CLI runtime discovery
- operation maps
- bundle contents tests
- release zip naming
- README, TODO, notice, and contributor document patterns
- backend policy such as handoff-only, cli-only, cli-preferred, mcp-only, or
  mcp-preferred

Flag issues when:

- the skill invents a structure where sibling skills already provide a stable
  convention
- CLI-backed or MCP-backed behavior diverges from sibling product contracts
  without explanation
- bundle, runtime, or release structure differs from sibling patterns without a
  documented reason
- the review needed sibling source or artifacts but they were not available and
  no human request was made

Do not reach into sibling skills by `../...` relative paths during normal skill
operation. Sibling references are for design and review evidence. If shared
material is required at runtime, copy stable guidance into this skill's own
`references/` or use a documented shared/template source.

## Cross-Skill Reference Checks

Agent Skills should not depend on another skill's internal files by relative
path traversal.

Flag issues when:

- `SKILL.md` or references link to another skill with `../...`
- a skill reads another skill's `references/`, `assets/`, `scripts/`, or
  runtime files as if they were local implementation details
- bundled behavior depends on files outside the skill directory
- installable bundle tests would fail because cross-skill relative paths are not
  present

Prefer one of these patterns instead:

- ask the user to explicitly use the other skill when that skill's workflow is
  needed
- mention the other skill as an available companion skill without loading its
  private files
- copy stable shared guidance into this skill's own `references/` when the
  material is required for standalone operation
- move genuinely shared reusable material to a documented shared location or
  template source, then reference it through the repository's established
  convention
- summarize the dependency in `SKILL.md` and keep each skill independently
  installable

Relative links inside the same skill are fine. Cross-skill relative links are
the problem because they break progressive disclosure, packaging boundaries,
and independent installation.

## Reference Reachability Checks

All bundled reference files should be discoverable from `SKILL.md`.

Check whether:

- every meaningful `references/**/*.md`, `references/**/*.json`, template, or
  helper reference is reachable from `SKILL.md`
- reachability may be direct links from `SKILL.md`
- reachability may be through `index.json` when `SKILL.md` tells agents to use
  it as a discovery index
- reachability may be through an intermediate Markdown index such as
  `references/INDEX.md`, if `SKILL.md` links to that index
- reference indexes accurately describe when to read each file
- unused, stale, or orphaned reference files are removed or clearly marked
  archival

Flag issues when:

- files under `references/` are not discoverable from `SKILL.md`,
  `index.json`, or a linked intermediate index
- `references/INDEX.md` exists but `SKILL.md` does not point to it
- `index.json` exists but `SKILL.md` does not say to use it for discovery
- reference files are bundled but no workflow explains why they exist
- stale reference files remain in the bundle and may confuse agents

## Template Checks

Use `references/templates/` for reusable template material.

Check whether:

- reusable examples are stored as templates rather than buried in prose
- templates are specific enough to copy or adapt safely
- templates avoid stale placeholder text in real generated output
- placeholders are clearly named, such as `PROJECT_NAME`, `VERSION`, or
  `SUMMARY`
- `SKILL.md` or a directly linked reference tells agents when to use each
  template
- installable bundles include required templates
- template files do not depend on another skill's private files

Flag issues when:

- a skill repeatedly describes a format in prose where a template would be more
  stable
- copyable examples contain hidden assumptions or unclear placeholders
- templates exist but are not discoverable from `SKILL.md`, `index.json`, or a
  directly linked reference
- generated output could accidentally retain placeholder text

## Example Checks

Use examples when they make agent behavior more stable.

Check whether examples are provided for:

- output formats
- review report formats
- refusal or limitation wording
- before/after writing improvements
- command invocation patterns
- JSON request or response shapes
- file layout expectations
- diagnostic or error message patterns
- handoff or final response shapes
- cases where a short prose rule is likely to be interpreted inconsistently

Good examples should be:

- small enough to scan
- concrete enough to copy or adapt when intended
- clearly marked as examples rather than source of truth
- aligned with the current rules
- free of private paths, secrets, stale project names, or placeholder leakage
- placed in `references/` for reading examples, or `references/templates/` when
  they are meant to be reused as output skeletons

Flag issues when:

- a fragile output shape is described only abstractly
- examples contradict the rules
- examples are stale after rule or workflow changes
- examples include hidden assumptions that would mislead an agent
- no example exists for a rule that repeatedly produces inconsistent outputs

## Prompt Shape Checks

For prompts and Agent Skill instructions, prefer context engineering over
strong identity assignment when practical.

This is a preference, not an absolute requirement. Avoid overusing prompt forms
such as "You are XXX" or "Act as XXX" when the same behavior can be produced
more robustly by surrounding the agent with the right context, references,
examples, constraints, output formats, and review criteria.

Prefer:

- describing the task, audience, constraints, and source-of-truth files
- providing examples that show the desired behavior
- defining review order and output format
- giving concrete acceptance criteria
- separating hard rules from preferences
- making the visible context naturally lead to the desired behavior
- using role labels only when they clarify a workflow or UI affordance

Flag issues when:

- the prompt relies mainly on identity assignment instead of concrete context
- "You are..." text is doing work that should be done by references, examples,
  or acceptance criteria
- the desired behavior is under-specified except for a role label
- identity wording makes the prompt brittle, theatrical, or broader than needed
- a reusable template would be more stable than a persona instruction

Do not ban identity statements. They may be appropriate for character agents,
conversation style adapters, simulations, or role-based workflows. The review
should ask whether identity wording is necessary and helpful, not whether it is
present at all.

## Prompt Language Checks

For prompts that are close to the edge of model-following reliability, English
instructions may be slightly more stable than Japanese instructions.

This is not a hard rule. Japanese is appropriate when the skill's main content,
examples, audience, or output style is Japanese. However, when a prompt has
become stable and its behavior matters, review whether core operational
instructions should be translated to English while keeping Japanese examples,
output text, or domain terms where they are needed.

Check whether:

- mature, stable prompt rules are still written only in Japanese even though
  they control fragile behavior
- operational rules, activation boundaries, review order, and safety checks
  would be clearer or more robust in English
- Japanese examples and English instructions are kept consistent
- bilingual content creates duplication or drift
- user-facing Japanese style rules remain in Japanese when that preserves nuance
- translation does not change the intended behavior

Prefer:

- English for core agent instructions, activation rules, review flow,
  verification, and failure handling when stability matters
- Japanese for Japanese writing examples, tone samples, publication text,
  glossary nuance, and user-facing output examples
- a single source of truth when bilingual text would drift

Flag issues when:

- a stable and fragile prompt remains Japanese-only without a reason
- English and Japanese versions of the same rule diverge
- translation was done mechanically and changed the intended nuance
- Japanese examples no longer match English operational rules

## Packaging Checks

When packaging or release is in scope, check:

- bundle includes `SKILL.md`
- bundle includes required `references/`
- bundle includes `index.json`
- bundle includes required assets, helpers, and runtimes
- bundle excludes development-only files, tests, caches, `.DS_Store`,
  `node_modules`, and `workplace/`
- isolated bundle shape still lets `SKILL.md` links resolve
- runtime lookup, if any, works from the installed bundle shape

## Severity Guidance

Use these severity levels:

- High: skill activation is too broad and likely to trigger unexpectedly.
- High: required runtime, reference, asset, or `SKILL.md` file is missing from
  an installable skill bundle.
- Medium: `index.json` is missing, stale, or not referenced from `SKILL.md`.
- Medium: `SKILL.md` is too large or contains detailed rules that should live in
  `references/`.
- Medium: important references exist but are not discoverable from `SKILL.md`
  or `index.json`.
- Medium: relevant sibling skill or product convention was not checked before
  introducing a divergent Agent Skill structure.
- Medium: `references/` contains orphaned or unreachable files not discoverable
  from `SKILL.md`, `index.json`, or a linked intermediate index.
- Medium: skill uses `../...` or other cross-skill relative paths to read
  another skill's internal files.
- Medium: reusable examples or output shapes should be templates under
  `references/templates/`, but are only described in prose or are not
  discoverable.
- Medium: examples are missing for fragile output shapes, command patterns, or
  workflows where examples are needed for stable agent behavior.
- Medium: bundle includes local-only or development-only files.
- Low: prompt wording leans on broad identity assignment where context,
  examples, constraints, or templates would make the behavior more stable.
- Low: mature operational prompt rules that control fragile behavior remain
  Japanese-only where English instructions would likely improve stability.
- Low: minor naming, reference organization, or navigation issue makes the
  skill harder to maintain.

## Review Output

Use this format when Agent Skills are in scope:

```text
Agent Skill Review

Activation policy: explicit / broad / unclear
SKILL.md shape: lean / too large / unclear
index.json: current / stale / missing / not checked
Bundle readiness: ready / partial / risky / not checked

Findings:
- Severity: ...
  Issue: ...
  Why it matters: ...
  Suggested direction: ...
```

Do not edit skill files during review mode unless the user explicitly asks to
switch to maintenance work.
