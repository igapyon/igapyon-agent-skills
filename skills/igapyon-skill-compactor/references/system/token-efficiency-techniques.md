# Token-Efficiency Checklist Index

Use this index to choose the smallest checklist that fits the current work.

For checklist timing, read [../checklists/checklist-timing.md](../checklists/checklist-timing.md) instead
of repeating pre-work, during-work, and post-work instructions in each
checklist.

Keeping checklists in references reduces repeated prompt and `SKILL.md` size.
Do not copy whole checklists into ordinary responses; summarize relevant checked
items and unresolved risks.

## Checklist Selection

- Use [../checklists/workflow.md](../checklists/workflow.md) for the outer system
  workflow: human discussion, R&D versus runtime, placement decisions, tooling,
  MCP, output constraints, and validation planning.
- Use [../checklists/agent-skill.md](../checklists/agent-skill.md) for individual Agent
  Skill compaction: activation gates, `SKILL.md`, references, splitting,
  trigger behavior, and validators.
- Use [../checklists/prompt.md](../checklists/prompt.md) for prompt and stable-context
  compaction: stable prefix material, changing inputs, output verbosity,
  structured results, and reasoning load.

When multiple layers apply, start with the workflow checklist, then read only
the lower-level checklist needed for the selected treatment.

Splitting checklists by use case is itself a token-efficiency technique: it
keeps recurring checks reusable while avoiding loading unrelated checklist items
for every task. When multiple checklists exist, place them under
`references/checklists/` with an index so agents can choose by viewpoint.

Separating reference layers is also a token-efficiency technique. Put broad
workflow and design references under `references/system/`, and concrete Agent
Skill maintenance references under `references/agent-skill/`, so agents can
avoid loading implementation details during system-level decisions and avoid
loading broad philosophy during narrow edits.

Separating storage from access is also a token-efficiency technique. It is
reasonable to retain medium-quality bulk materials such as work logs, past
examples, design notes, and failure cases, but the normal runtime path should
start from generated indexes, concise front matter, distilled files, or targeted
references. Do not confuse "the information exists" with "the information
should be read every time."

Centralizing checklist timing is also a token-efficiency technique: repeated
"before implementation", "during implementation", and "after implementation"
instructions stay in one reference instead of being copied into every checklist.

Generated file indexes are also a token-efficiency technique. Use `miku-indexgen`
to create or refresh `index.json` for skills with multiple references so agents
can choose files from summaries before reading full contents.

Search-friendly generated index formatting is also a token-efficiency
technique. A compact `index.json` where each file entry fits on one line is
easy to inspect with `rg`, `grep`, or line-oriented reads, reducing the need to
load the whole index or full source files.

The generated `index.json` produced by `miku-indexgen` is the nearby reference
example: it keeps each file entry compact and line-searchable while retaining
metadata useful for file selection.

For true record lists, consider JSONL instead of a JSON array. JSONL keeps one
record per line, which is easier to search, stream, sample, split, and inspect
with line-oriented tools. This can lower agent reading load in practice, though
the actual benefit depends on the runtime and task.

Grep/rg-friendly authoring is also a token-efficiency technique. Use stable,
literal, task-relevant terms in headings, file names, front matter, checklist
items, and generated summaries so agents can find the right material with
targeted search instead of broad reading. Prefer searchable words over clever
phrasing when the text is meant for agent routing.

Content-expressive file names are also a token-efficiency technique. File names
should expose the document's topic, purpose, and use case well enough that an
agent can often choose whether to open the file from a file list or generated
index. Avoid vague names such as `notes.md`, `misc.md`, or `prompt.md` when a
more specific name such as `release-note-template.md` or
`article-section-image-prompt.md` would reduce discovery cost.

For Agent Skill prompts and runtime references, meaningful English file names
are often practical because they are ASCII-safe, tool-friendly, and usually easy
for generative models to interpret. Follow existing repository conventions and
use Japanese names when the domain, source material, or human workflow clearly
benefits from Japanese. Treat file-name language as a routing decision, not as
a fixed rule.

Ordered file names are also a token-efficiency technique when documents form a
sequence. Use zero-padded order markers such as `001-`, `010-`, or
`topic-001-purpose.md` so lexical sorting matches the intended reading or
execution order. Keep a meaningful topic or purpose in the name; a number alone
helps ordering but does not help routing.

Filesystem sort order is part of the agent interface. Predictable lexical
ordering helps humans scan directories, and it also helps generative AI agents
when they inspect file lists, generated indexes, or command output. Design
ordered file names so the natural filesystem order is the intended navigation
order, not something the agent has to infer from prose.

Use a search and reading ladder: grep/rg-friendly text first, generated
`index.json` for compact file discovery, `distilled/` for curated runtime
meaning, and full references or original sources only when the smaller layers
are insufficient.

Purpose narrowing is also a token-efficiency technique. Before reading,
rewriting, or compacting, reduce "everything" to the smallest useful decision
scope: the relevant viewpoint, file, section, function, log range, diff, or
output shape. This lowers input, output, and reasoning cost before any later
compression is needed.

Markdown line count is a useful warning signal. A long file is not automatically
wrong, but a rapidly growing `SKILL.md`, checklist, reference, or example file
should trigger inspection. Ask whether the file is still one coherent runtime
unit, or whether parts should move to references, distilled files, templates,
examples, scripts, assets, generated indexes, line-oriented records, or archive.
Use line count as an early smell, not as an automatic deletion rule.

Markdown heading hierarchy is also a token-efficiency technique. Use `##` and
`###` headings to expose the document structure, decision points, procedures,
examples, and caveats. Good headings let agents search, skim, and jump to the
right section; weak structure turns even moderate-length Markdown into a broad
reading task. Keep heading levels consistent and use literal, task-relevant
terms in headings.

Appropriate bullet structure is also a token-efficiency technique. Use short
paragraphs for thesis, rationale, and caveats, then use bullet lists for
conditions, constraints, steps, options, examples, and checks. Bullets make item
boundaries easier for agents to parse, search, compare, and reuse. Avoid
turning everything into bullets: long flat lists, deep nesting, and context-free
items can hide priority, causality, and intent.

Viewpoint-separated writing is also a token-efficiency technique. Runtime
references should usually separate purpose, constraints, assumptions,
procedures, examples, exceptions, and validation instead of weaving them into
one dense paragraph. Woven prose is useful for essays, background, and nuanced
rationale, but for agent runtime use it often forces broad reading before the
model can extract the needed part. Preserve nuance as short prose, then expose
actionable viewpoints with headings or bullets.

Meaning-preserving local aliases are also a token-efficiency technique. When a
long term, path, concept, or target appears repeatedly, define a short local
name once and use it consistently. Prefer aliases that retain meaning, such as
`target skill`, `pre-ingestion filter`, or `distilled md`, over opaque symbols
such as `A`, `B`, `甲`, or `乙`. Very short symbolic aliases can save characters
but raise re-reading and confusion cost, especially in long conversations or
when several targets are being compared.

Use local aliases only when the repeated-term savings greatly outweigh the
definition, lookup, and confusion cost. They help when a long name appears many
times in the same runtime context. They are usually not worth it for one-off
mentions, already short terms, or cases where readers and agents must
repeatedly look back to recover what the alias means.

Cache-friendly stable files are also a token-efficiency technique. Split
reusable guidance into coherent, appropriately sized files and keep them stable
across repeated runs. The raw processed text may be similar, but stable repeated
context can be more cache-friendly than constantly rewritten prompt text or
mixed volatile notes. Treat provider-specific cached-token behavior as a
current-product detail to verify, not as a permanent guarantee.

When reviewing cost qualitatively, this can count as lighter if the repeated
stable context is expected to be cache-friendly or discounted compared with
fresh per-run prompt text. Report it as an expected runtime-efficiency benefit,
not as a precise token or billing calculation.

Markdown front matter for `miku-indexgen` is also a token-efficiency technique.
Add concise `title`, `description`, and practical `topics` to reference
Markdown when they improve generated `index.json` routing. Good front matter
lets agents choose the right file from index summaries instead of reading many
full Markdown files. Use [../agent-skill/frontmatter-templates.md](../agent-skill/frontmatter-templates.md)
for samples and templates.

Keep routing metadata concise. Overlong `description`, `category`, `topics`, or
front matter can become a second body text and reduce the benefit of indexing.
Use enough metadata to choose a file, not enough to replace the file.

Distilled Markdown is also a token-efficiency technique. Put curated summaries
derived from larger source materials under top-level `distilled/` when repeated
runtime use needs the distilled meaning rather than full source documents. Use
top-level `distilled/` when distillation is a first-class runtime entry point;
use `references/distilled/` only for small or legacy skills where that local
placement is already clearer. The distillation viewpoint often requires human
judgment; ask when it is not obvious. Distilled files must have an update path
when sources or decisions change.

When typical topics emerge from repeated work, topic-specific distilled files
can reduce future reading. Propose them to the human with the intended topic
boundary and viewpoint before creating them unless the request already makes
both explicit.

Test prompts are also a token-efficiency technique when kept out of runtime
context. Put activation prompts, non-activation prompts, behavior prompts, and
reference-routing prompts under top-level `tests/` when they are validation
assets rather than runtime examples. Prefer compact JSONL for prompt/expected
records when line-oriented search and partial execution matter. Keep only a
short "validate with representative prompts" instruction in `SKILL.md`.

Prompt-test-driven compaction is also a token-efficiency technique. Before
risky prompt or Agent Skill refactoring, create compact representative tests
for activation, non-activation, behavior, reference routing, and human-judgment
cases. Run them before and after compaction so token reduction does not silently
change the contract. This keeps validation evidence reusable and prevents long
manual re-explanations in each maintenance prompt.

Keep prompt tests separate from runtime prompts. Test prompts belong under
`tests/` and should be loaded only for validation. Runtime prompts belong in
`SKILL.md`, references, templates, examples, or per-run user input. Mixing test
cases into runtime instructions increases always-loaded context and can blur
activation behavior.

Templates and examples are also token-efficiency techniques. Put stable output
formats, reusable skeletons, and representative examples in `templates/` or
`examples/` when they prevent repeated prompt explanations. Keep `SKILL.md`
limited to when and how to use them, and load only the specific template or
example needed for the task.

Keep the roles separate: `templates/` communicate output structure, while
`examples/` communicate expected quality, tone, granularity, and boundaries.
Large examples should not live in always-loaded `SKILL.md`.

Output-length constraints are also a token-efficiency technique. For repeated
work, state whether the answer should be short, bullet-only, code-only,
diff-only, table-free, one-line-reasoned, or validation-summary-only. Preserve
required decision evidence when shortening; an under-explained answer that
forces a rerun is not actually lighter.

Assets are token-efficient when treated as output resources rather than
reference prose. Put images, fonts, boilerplate files, binary templates, and
sample documents under `assets/` when the agent should use or copy them without
reading them as ordinary context.

Pre-ingestion tool-result filtering is also a token-efficiency technique. When
scripts, CLI commands, MCP tools, or other tools return large results, prefer
reducing the result before it enters the agent context. Use tool-side filtering,
field selection, summaries, pagination, limits, query constraints, or
line-oriented extraction instead of receiving a huge payload and asking the
model to ignore most of it.

If a repeated tool workflow has no way to reduce output volume, ask whether the
tool provider or local wrapper can add output-limiting options such as
`--limit`, `--fields`, `--format`, `--summary`, pagination, or server-side
filters. Tool output design is part of token-efficiency design, not merely a
downstream prompt concern.

Near-duplicate text should usually be commonized. When the same or almost the
same paragraph, checklist timing rule, output shape, warning, or example appears
in multiple places, move it to the smallest shared location that preserves
meaning: a reference, checklist, template, example, distilled file, or script.
Keep only short "when to use" links at call sites. Preserve local wording only
when the differences are meaningful.

Do not commonize text merely because the wording is identical. Identical
sentences can carry different meaning when they sit under different activation
contracts, audiences, timing, safety constraints, validation duties, output
contracts, or repository boundaries. Commonize only the meaning that is truly
shared, and keep local copies or local deltas when the same words protect
different behavior.

Work-derived knowledge capture is also a token-efficiency technique. When a
maintenance session discovers a reusable token-saving pattern, record it in the
smallest appropriate shared place: techniques, checklist, template, example,
test, distilled file, script, or README. This avoids rediscovering the same
reasoning in later sessions while keeping ordinary prompts smaller.

Reference-model delta definition is also a token-efficiency technique. Use a
well-known standard, process, pattern, or concept as the base model, then state
only the meaningful delta. To avoid unsafe inheritance, specify:

- base model: the known standard or concept being referenced
- inherit: what should be carried over
- override: what is changed
- do not infer: what must not be assumed from the base model

Use this when the base model is likely to be understood accurately and
consistently by the generative AI. It does not have to be easy for every human
reader, although human-facing outputs may need a short explanation of the base
model. Avoid it when the base model is ambiguous, version-sensitive, disputed,
not likely to be represented reliably by the model, or when incorrect
inheritance would be costly.

Bounded prompt loops are also a token-efficiency technique when used carefully.
Use a loop only with an explicit target set, maximum pass count or stop
condition, minimal-context rule, and short state record. A good loop avoids
repeating long instructions and repeatedly applies a checklist or inspection
rule to relevant items. A bad loop repeatedly rereads broad context, expands
scope, or continues without new useful findings.

For any prompt loop, define:

- target set: files, checklist items, candidates, or failures to inspect
- per-iteration action: what to read, decide, edit, or validate
- context budget: read the smallest useful context each pass
- state record: what was checked, changed, skipped, or blocked
- stop condition: complete, human decision needed, no new useful change,
  repeated blocker, or maximum passes reached

Never use an unbounded loop. If another pass is unlikely to improve the result
relative to the extra context cost, stop and report the residual risk.

State checkpoint files are also a token-efficiency technique. Use `TODO.md` or
another short state file for multi-pass work so the agent does not have to
reconstruct current tasks, blockers, decisions, and next actions from long
conversation history. Keep it short and current. Do not use it as a general
notes dump.

A useful `TODO.md` records:

- current unfinished tasks
- completion conditions
- blockers or human decisions needed
- next action
- last material update

Remove or archive stale completed items. If `TODO.md` grows into a long history,
it becomes context debt instead of a state cache.

Session handoff summaries are also a token-efficiency technique. When a long
conversation should be continued in a new session, carry forward only the
purpose, decisions, constraints, unresolved points, next action, and files or
materials to inspect. Do not paste the whole prior conversation back into the
new context.

Automatic compaction and summarization are useful aids but poor primary
architecture. They can drop exact wording, intermediate judgments, or details
that only become important later. Prefer preventing repeated broad context from
entering the workflow, then use compaction as a fallback or transition aid.

Essential context preservation is also a token-efficiency technique. Do not
delete the purpose, constraints, decision criteria, prohibitions, required
output format, or important assumptions merely to shorten the prompt. Missing
essentials often cause wrong answers, clarification loops, and higher total
token use.

Language conversion is an optimization to measure, not a default rule. English
or another language may be token-lighter for some content and models, but
translation can add length, ambiguity, or rework. Try it only when the
measurement or operating context justifies it.

Entry-point README files can also be a token-efficiency technique for
repositories, tools, and larger projects. A concise README can give agents the
project purpose, layout, common commands, validation entry points, and navigation
rules without forcing broad repository exploration.

Keep the distinction clear:

- project/repository README: useful when it prevents repeated discovery work
- Agent Skill-local README: usually avoid; use `SKILL.md`, `index.json`,
  `references/`, `templates/`, `examples/`, and `distilled/` instead
- explicitly useful Agent Skill-local README: acceptable as a human-facing entry
  map for background, philosophy, directory layout, and maintenance workflow,
  but do not copy that background into runtime instructions

A good token-efficient README is an entry map, not a manual. It should point to
the smallest files or commands needed for common tasks and avoid duplicating
content already maintained elsewhere.

For repositories and larger projects, move details from README into `docs/`.
Keep README focused on orientation, navigation, quick start, and the most common
commands. Put long explanations, design notes, operational procedures, and
deep references under `docs/` with searchable names and headings.

Archive directories can also support token efficiency. Move obsolete, superseded,
or historical materials to `archive/` when they should be retained but should
not appear in the normal reading path. Mark archived files with clear names or
front matter such as `status: archived` or `status: deprecated` when useful.

Do not archive material that is still needed for runtime decisions. Do not use
`archive/` as a trash can for unresolved current work. The goal is to keep
current discovery paths focused while preserving history when deletion would be
too destructive.

File-native organization should usually come before RAG or database-backed
retrieval for Agent Skill-scale work. Markdown, front matter, directory
structure, generated `index.json`, distilled files, templates, and examples can
solve many routing problems with low operational overhead. If the collection
later outgrows this, the same curated files can become input to RAG, vector
search, RDBMS-backed lookup, or MCP-backed retrieval.
