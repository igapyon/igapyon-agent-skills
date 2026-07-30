# Compaction Workflow Details

Use this reference before substantial edits, architectural placement decisions,
splitting, toolization/MCP decisions, or behavior-risking removals. Do not read
it for a small local conservative edit when the core contract in `SKILL.md` is
sufficient.

## 1. Frame The System

Clarify with the human when needed:

- what repeated runtime task is being optimized
- who or what invokes it
- what output must stay stable
- which failures are costly
- whether this is still R&D or already stable runtime use
- where input, cached/stable input, output length, and reasoning depth may affect cost

## 2. Read Early For Understanding

Target skills may be read before the architecture is settled.

- Skim the target `SKILL.md` and nearby references to learn current intent.
- Avoid editing before system boundaries and placement choices are clear.
- Note apparent trigger intents, workflows, and overloaded responsibilities.

## 3. Inventory The Current Workflow

Check:

- Agent Skills involved
- prompts, templates, examples, and repeated instructions
- CLI commands, scripts, tools, MCP servers, or external services
- whether those tools can constrain output before returning it to the agent
- whether the skill is content-only, execution-oriented, or hybrid
- inputs that change every run versus stable context
- stable instructions that could become prompt-cache-friendly prefix material
- outputs that are required versus explanatory noise
- steps that require deep model judgment versus routine tool execution

## 4. Decide Placement Before Editing

Classify each piece of meaning:

- keep in human procedure: choices that require user judgment or policy preference
- split into another skill: independent trigger intent, audience, domain, workflow, or output contract
- keep in `SKILL.md`: activation gate, core workflow, critical constraints
- move to `references/`: detailed guidance, examples, long checklists
- move to `distilled/`: curated Markdown distilled from larger source materials
  for repeated runtime use
- move to `tests/`: activation, non-activation, behavior, or reference-routing
  prompts used only for validation
- move to `scripts/`: deterministic repeated operations
- move to `assets/`: output resources such as images, fonts, boilerplate, binary templates, or sample documents
- move to MCP/tooling: external data access, service operations, shared state, or repeatable integration
- add tool output constraints: limits, field selection, summaries, pagination, or server-side filters before results enter context
- move to stable prefix material: repeated instructions that should remain early and unchanged
- encode as output constraints: stable formats, required sections, verbosity limits, validation summaries
- reduce reasoning demand: separate hard judgment points from routine extraction, formatting, or verification
- delete: duplication, generic advice, obsolete notes, long explanations Codex already knows

## 5. Map Each Skill Contract

Before rewriting, reread target skill directories in detail and map:

- activation triggers and non-triggers
- required behavior and output style
- referenced files, scripts, assets, and validation steps
- safety, repository, or domain constraints that must not be weakened
- whether the skill actually contains multiple separable skills

## 6. Add Prompt Tests Before Risky Compaction

Before changing prompts or Agent Skill instructions that may affect behavior,
create or update compact representative tests under `tests/`.

Cover the smallest useful set:

- activation prompts that should trigger the skill
- non-activation prompts that should not trigger it
- mention-only prompts that should only receive guidance
- behavior prompts for preserved output contracts and safeguards
- reference-routing prompts for choosing the intended reference, distilled file,
  checklist, template, example, or test material
- ask-human prompts where commonization, splitting, or deletion is uncertain

Run a baseline test pass before compaction when feasible. Treat ambiguous
expected results as design questions for the human, not as failures to hide.

## 7. Choose The Treatment

- Choose the compaction mode before rewriting. Use
  [compaction-modes.md](compaction-modes.md). Default to `conservative` when
  the user has not specified a stronger mode.
- Compact when one coherent skill has too much always-loaded detail.
- Split when unrelated jobs only share a directory, name, or historical origin.
- Toolize when the work is deterministic, repetitive, or better verified outside the model.
- Use MCP when the work is primarily access to external services, shared data, or repository state.
- Prefer tools that can return only the needed subset; if they cannot, consider asking the provider or wrapper owner to add output-limiting options.
- Treat pure content skills, execution-oriented skills, and hybrid skills differently; do not add scripts or MCP merely to make a content skill look more engineered.
- Distill when large source materials are repeatedly consulted but only a
  stable subset of their meaning is needed at runtime.
- Add tests when changes to triggers, references, output contracts, or
  commonized text need representative prompt validation.
- Constrain output when verbose replies are not part of the required result.
- Preserve reasoning depth where correctness depends on judgment, but avoid using it for routine steps.
- Leave as-is when extra instructions are safeguards whose removal would change behavior.
- Keep shared rules in each child skill only when they are required for that child skill.
- Do not create many tiny skills when one coherent activation contract is enough.

## 8. Rewrite And Validate

When rewriting:

- make `SKILL.md` a concise router and procedure
- link every reference file from `SKILL.md` with a clear "when to read" rule
- link distilled files from `SKILL.md` or a nearby reference with a clear source
  and refresh rule
- avoid deep reference chains
- avoid duplicating the same rule in multiple files
- do not commonize identical wording when local context gives it different
  behavior or safety meaning
- keep hard-trigger skills hard-triggered
- keep broad-trigger skills broad only when that is intentional
- avoid making descriptions so broad that skills activate for generic tasks
- ensure split skills do not accidentally overlap and double-trigger

Validate by checking:

- before/after behavior against representative user requests
- prompt-test results before and after risky compaction
- required references are reachable
- available skill validators pass
- repeated runtime input, output, and always-loaded context are expected to decrease
- any behavior intentionally changed or left risky is reported
