# Refactoring Need Review

Use this reference to review whether accumulated software, source code,
documentation, Markdown references, templates, configuration, or generated
artifacts have reached the point where work should pause for refactoring,
reorganization, or consolidation.

This review is not about making everything perfect. It asks whether continued
feature additions or small edits are becoming riskier than stopping to reshape
the structure.

## Review Priority

Use this review when the target shows signs of incremental growth, repeated
patching, duplicated patterns, unclear ownership, stale documentation, or
"this worked before, but now it feels wrong" structure.

Use it for:

- source code
- CLI, Java, Node.js, Maven, npm, or build scripts
- Agent Skills and reference-heavy skills
- Markdown documents, README files, TODO files, and reference collections
- generated files and generation pipelines
- repository layout and packaging workflows

Use it together with software completion review when deciding whether a project
is actually ready, and with repository entrypoint, generated artifact, markdown
structure, Agent Skill, and structured data reviews when those areas are in
scope.

## Accumulation Signals

Check for signs that the project has grown by accretion:

- several small fixes now form one hidden larger design
- similar logic appears in multiple files with small differences
- old names no longer match current behavior
- new options, flags, files, or sections were added without a clear organizing
  principle
- comments explain historical accidents instead of current intent
- TODOs, workarounds, temporary paths, or compatibility shims are becoming
  normal workflow
- tests or docs require knowledge of past conversations to understand the
  current shape
- generated artifacts or indexes are correct only because of fragile local
  ordering or undocumented assumptions

These signals do not automatically require refactoring. They indicate areas to
inspect more carefully.

## Code Refactoring Checks

For source code, check whether:

- core behavior is duplicated across CLI, library, API, UI, MCP, Java, Node.js,
  or Agent Skill surfaces
- functions or classes have grown to handle several responsibilities
- naming, data models, errors, or result shapes differ between similar paths
- configuration and constants lack a clear source of truth
- validation, logging, diagnostics, or output formatting is scattered
- public behavior is hard to test because implementation boundaries are blurred
- performance or memory problems are being patched locally instead of addressed
  in the data flow
- new features require touching unrelated files because ownership boundaries are
  weak

Prefer focused refactoring when it reduces active risk. Do not recommend large
rewrites when a narrow extraction, rename, shared helper, or generated source of
truth would solve the problem.

## Documentation and Markdown Refactoring Checks

For Markdown, references, README, TODO, or docs, check whether:

- one document has grown into several topics that should be split
- many small files exist but no index, map, or summary explains how to choose
  the right one
- headings no longer match the actual content
- repeated sections differ only slightly and should share a template or common
  wording
- old assumptions remain beside new rules without explaining precedence
- `TODO.md` contains completed, obsolete, speculative, and active work mixed
  together
- Agent Skill `SKILL.md` has become a rulebook instead of a concise entrypoint
- reference-only skills need `references/INDEX.md`, `SUMMARY.md`, or a similar
  navigation file
- Markdown titles and first headings are too weak to produce useful `index.json`
  summaries

For docs, refactoring may mean splitting, merging, renaming, adding an overview,
moving examples to templates, or deleting stale sections.

## When to Pause

Recommend pausing feature work or release work for refactoring when:

- the same issue keeps appearing in multiple areas
- review findings are mostly about structure rather than a single bug
- a release would freeze confusing public names, paths, commands, or docs
- future changes are likely to duplicate or conflict with existing patterns
- tests are difficult to add because the structure hides the behavior boundary
- docs cannot be made accurate without reorganizing the implementation or the
  reference structure
- generated artifacts cannot be trusted without clarifying the source of truth

Do not recommend pausing when:

- the issue is purely cosmetic
- the project is intentionally a small throwaway prototype
- the risk can be handled by one local fix
- refactoring would delay an urgent bug fix without reducing immediate risk

## Suggested Direction Checks

When recommending refactoring, keep the direction concrete:

- name the files or areas that should be reorganized
- identify the duplicated concept or unclear boundary
- suggest a small first refactoring step
- state what should remain unchanged
- state what tests or generated artifacts should be rerun after refactoring
- distinguish release-blocking refactoring from post-release cleanup

Avoid vague findings such as "needs cleanup" without explaining what pressure
the cleanup reduces.

## Severity Guidance

Use these severity levels:

- High: accumulated structure creates release risk, inconsistent public
  behavior, likely bugs, misleading docs, or unsafe generated artifacts.
- Medium: refactoring should be scheduled before substantial new work because
  duplication, naming drift, or unclear boundaries are increasing change cost.
- Medium: Markdown, references, or Agent Skill structure has grown enough that
  agents may choose the wrong file, miss important rules, or load too much
  context.
- Low: local cleanup or renaming would improve maintainability but does not
  block current work.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Refactoring Need Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Refactoring pressure: low / medium / high / not checked
Pause recommended: yes / no / partial / not checked
Scope: code / docs / Agent Skill / generated artifacts / repository layout / mixed
```

Do not perform refactoring during review mode unless the user explicitly asks to
switch to maintenance work.
