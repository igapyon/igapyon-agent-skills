# igapyon-skill-compactor

`igapyon-skill-compactor` is an Agent Skill for compacting oversized Agent
Skills while preserving trigger behavior, output contracts, safety constraints,
and maintainability.

This README is for human maintainers. Runtime behavior belongs in `SKILL.md`
and targeted references. Do not treat this README as an always-loaded prompt.
It is intentionally allowed to be more explanatory than `SKILL.md`: after a
maintainer has chosen to inspect this skill, the goal is to transmit the
background and design intent before describing the individual files.

## Background

The starting problem is not simply that a `SKILL.md` becomes long. The larger
problem is that modern generative AI models can make unintended moves when
large, repeated, ambiguous instructions are always loaded into context.

This skill treats token reduction as system design:

- place meaning where it belongs
- preserve behavior before shortening text
- use progressive disclosure instead of always-loaded detail
- split independent responsibilities when one skill has grown into many jobs
- move deterministic work to scripts, tools, or MCP when that is the better
  boundary
- keep tests, examples, templates, distilled materials, and references out of
  the runtime path unless they are needed

The final act may be compacting an Agent Skill, but the work starts with the
larger workflow: triggers, repeated inputs, stable context, outputs, validation,
and human judgment points.

This project grew from article-level thinking about runtime token efficiency:
the cost of repeated input, unnecessary output, unnecessary reasoning, and
avoidable reruns. Those ideas are distilled for runtime use under `distilled/`,
but this README keeps the human-facing story visible.

## Philosophy

Compaction is not deletion. It is the controlled relocation of meaning.

Useful meaning may stay in `SKILL.md`, move into `references/`, become a
distilled runtime summary under `distilled/`, become a reusable structure under
`templates/`, become a representative case under `examples/`, become prompt
tests under `tests/`, or become a deterministic script or tool.

Near-duplicate text should be commonized only when the meaning is truly shared.
Identical wording can still have different meaning when it appears under a
different activation contract, audience, timing rule, safety constraint,
validation duty, or output contract.

The skill should therefore behave more like a careful maintainer than a text
compressor. It should ask what must remain true, identify what is merely
repeated, and choose whether the right answer is compaction, splitting,
distillation, toolization, testing, archiving, or no change.

## Design Thesis

An Agent Skill is not just a Markdown file. It is part of a runtime system where
activation metadata, loaded instructions, referenced materials, tools, test
prompts, and human decisions all shape model behavior.

The important design question is therefore not "How can this text become
shorter?" It is "Which meaning must be present at which moment, for which
decision, at what risk?" Shortening comes after that placement decision.

This skill assumes that modern generative AI models are powerful but not
perfectly obedient. When a prompt is broad, repetitive, or internally
ambiguous, the model may infer an action that was never intended. Token
efficiency is therefore also a safety and behavior-preservation concern:

- smaller runtime context reduces irrelevant attention targets
- clearer activation contracts reduce accidental skill use
- separated references reduce accidental cross-contamination of ideas
- prompt tests reveal behavior changes that a shorter diff may hide
- stable files reduce repeated explanation and may become more cache-friendly

This is why the workflow starts outside the file being shortened. A bloated
skill may be a symptom of several different problems:

- one skill is carrying multiple activation intents
- long source material has not been distilled
- repeated examples are living in always-loaded instructions
- validation prompts are mixed with runtime prompts
- deterministic work is still described in prose instead of delegated to a
  script, tool, or MCP integration
- broad tool output is entering context before filtering
- project background is being re-explained in conversation rather than stored
  in a human-facing entry document

The compacted text is the visible result. The actual design work is identifying
which of these causes is present.

## Behavioral Preservation

The first invariant is behavior preservation.

When compacting an Agent Skill, preserve:

- activation triggers
- non-trigger boundaries
- mention-only behavior
- output contracts
- required tone or style
- safety and repository constraints
- validation steps
- reference reachability
- human judgment points

If any of these change, the change should be explicit and intentional. A smaller
skill that silently activates in new situations, stops asking necessary
questions, or loses a safeguard is not an improvement.

This is especially important because activation metadata is loaded before the
skill body. A small mistake in the frontmatter `description` can change when the
skill is used. Compaction must treat activation wording as a contract, not as a
summary to casually rewrite.

## Meaning Placement

The central act is deciding where meaning belongs.

`SKILL.md` should contain the activation contract, the core workflow, and
constraints that must be present every time the skill runs. It should not become
a warehouse for examples, background, long checklists, test cases, or historical
discussion.

`references/` should contain details that are needed only for particular
decisions. `distilled/` should contain curated summaries of larger source
materials when repeated runtime work needs the essence, not the original source.
`templates/` should carry reusable structure. `examples/` should carry
representative quality and boundary signals. `tests/` should carry validation
prompts, not runtime instructions.

This separation is not mere tidiness. It makes the reading path explicit:
discover with `index.json`, search with `rg`, check distilled material, then
read full references only when needed.

Meaning placement also controls update cost. A checklist copied into five
places will drift. A single checklist under `references/checklists/` can be
updated once and reused many times. A prompt test under `tests/` can protect a
behavior without being loaded during ordinary execution. A distilled file can
keep a source article's useful essence close to runtime without forcing the
agent to read the full article again.

## Reading Ladder

A token-efficient agent should not read everything first.

The intended ladder is:

1. Use file names, headings, front matter, and `index.json` to find likely
   material.
2. Use `rg` or another targeted search when the needed term is known.
3. Read `distilled/` when a curated summary may answer the question.
4. Read the smallest relevant reference file.
5. Read original source material only when the smaller layers are insufficient.

This ladder matters because discovery cost is often repeated. Good file names,
single-line index entries, front matter, and viewpoint-separated references make
future runs cheaper without deleting useful knowledge.

## Human Judgment

Some compaction decisions cannot be made from text shape alone.

The human should be involved when the target may need to be split, when similar
phrases may carry different meaning, when a distilled viewpoint is not obvious,
or when deleting a safeguard could change behavior. The skill should help make
those decisions smaller and more explicit, not pretend that every reduction can
be automated.

The practical rule is simple: compact confidently when the meaning is clearly
preserved; ask when the boundary is architectural, behavioral, or semantic.

Human judgment is also needed for distillation. A distilled Markdown file is not
just a summary; it is a summary from a chosen viewpoint. The useful viewpoint
may be "runtime token-efficiency design for Agent Skill maintenance" rather
than "article summary" or "publication abstract." When that viewpoint is not
obvious, ask before creating or rewriting distilled material.

## Risk Model

Every compaction has some risk. The risk is acceptable only when it is visible
and checked.

Common risks include:

- activation becoming too broad or too narrow
- non-trigger cases beginning to trigger
- examples losing the nuance that made them useful
- commonized text losing local safety meaning
- reference routing becoming harder
- tests being mistaken for runtime instructions
- a shorter answer causing clarification loops and higher total token use

Prompt-test-driven refactoring exists to make these risks observable. It cannot
prove a skill correct, but it can catch representative regressions before a
shorter prompt is accepted as an improvement.

The goal is not to create an exhaustive test suite for language behavior. That
would become its own context debt. The goal is to keep a compact set of
representative prompts that protect the contracts most likely to regress:
activation, non-activation, mention-only behavior, reference routing, preserved
output behavior, and cases that should ask the human.

## Refactoring Stance

Refactoring an Agent Skill is closer to refactoring an API than editing prose.
The user-facing prompt behavior is the public surface. References, tests,
templates, examples, and scripts are implementation details that support that
surface.

This leads to several working rules:

- commonize meaning, not just identical sentences
- preserve local deltas when similar text has different safety meaning
- prefer clear "when to read" links over deep reference chains
- avoid adding many tiny skills when one activation contract is still coherent
- split when independent jobs share only history or directory location
- keep stable files stable to avoid churn and preserve cache-friendliness
- archive historical material when it should be retained but not routed to
  during normal work

The refactoring is successful when the next agent can find the right material
with less reading and still produce the same intended behavior.

## Directory Map

- `SKILL.md`: activation gate, compact workflow, and reference navigation.
- `index.json`: generated discovery index from `miku-indexgen`; refresh it,
  do not edit it by hand.
- `references/system/`: broad philosophy and token-efficiency techniques.
- `references/agent-skill/`: concrete Agent Skill compaction workflow and
  maintenance rules.
- `references/checklists/`: reusable checklists separated by viewpoint.
- `distilled/`: human- or agent-approved summaries distilled from larger source
  materials for repeated runtime use.
- `templates/`: reusable output and front matter skeletons.
- `examples/`: examples that communicate quality, tone, granularity, and
  boundaries.
- `tests/`: validation prompts and the local prompt-test runner.

## Prompt-Test-Driven Refactoring

For risky compaction, use prompt tests before rewriting the skill.

1. Add or update representative prompt cases under `tests/`.
2. Run a baseline test before compaction.
3. Refactor prompts, references, routing, or `SKILL.md`.
4. Run the same tests after compaction.
5. Compare activation behavior, non-activation behavior, reference routing,
   output contracts, and cases that should ask the human.
6. Report failures, ambiguous expectations, and behavior changes instead of
   silently accepting them.

Prompt tests are intentionally separate from runtime prompts. They are
validation assets, not instructions that should be loaded during ordinary skill
use.

## Test Runner

Dry run:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs --dry-run
```

Run one representative case:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs --case activate-001
```

Run all prompt tests:

```bash
node skills/igapyon-skill-compactor/tests/run-codex-prompt-tests.mjs
```

Results are written under the repository-local,
Git-ignored `workplace/skill-compactor-tests/` directory.
Every run gets a new directory and records the source/installed hashes, Git
commit, Codex version, model, reasoning level, sandbox, raw events, tool trace,
and deterministic assertions. The runner sends only the case prompt to the SUT;
hidden expectations are supplied later to an independent evaluator. It fails on
missing or malformed output, wrong activation or route, forbidden reads/writes,
critical-content loss, or evaluator failure. Use `--source-only` only while
developing an intentionally unsynchronized source tree.

## Maintenance Notes

- Keep `SKILL.md` as a compact router and procedure.
- Keep this README human-facing; avoid copying its background prose into
  runtime prompt material.
- Prefer `##` and `###` headings, content-expressive file names, and
  grep/rg-friendly wording.
- Prefer JSONL for true prompt-test record lists.
- Refresh `index.json` after adding, removing, or renaming skill files.
- Run the skill validator after structural changes.
