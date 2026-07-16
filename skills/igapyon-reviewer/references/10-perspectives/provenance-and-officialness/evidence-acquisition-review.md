# Evidence Acquisition Review

Use this reference to review whether prompts, Agent Skills, documentation, or
workflow instructions prevent unsupported output by requiring agents to obtain
missing evidence before acting.

This review is especially important for Agent Skills that generate, modify, or
recommend source code. A code-generation skill should not let an agent write
implementation details from common sense, memory, or guessed framework behavior
when the required facts are not available.

## Review Priority

Use this review when the target includes:

- Agent Skills that generate or modify source code
- `PROMPT.md`, `SKILL.md`, or workflow instructions for implementation agents
- coding, migration, refactoring, API integration, CLI, build, test, or package
  generation workflows
- instructions that depend on external APIs, library behavior, framework
  conventions, version-specific behavior, or repository-local patterns
- review requests about hallucination resistance, unsupported facts, evidence,
  source of truth, or missing-information handling

Use it together with Agent Skill Review when reviewing a skill directory or
`SKILL.md`.

## Strictness Mode Checks

Evidence acquisition does not have to block every workflow in the same way.
Check whether the target chooses an evidence strictness mode appropriate to its
risk.

Useful modes include:

- `strict`: do not proceed when required facts are missing; investigate or ask
  the user first
- `balanced`: proceed on low-risk assumptions only when they are explicit and
  easy to revise
- `exploratory`: allow sketches, examples, drafts, or design options while
  clearly marking unverified details

For programming, implementation, migration, build, dependency, security,
authentication, data handling, or test-generation work, `strict` should normally
be the default. A different mode is acceptable only when the skill clearly says
which outputs are assumption-tolerant and prevents those assumptions from being
presented as verified implementation facts.

Flag issues when:

- the skill applies the same blocking behavior to every task even when drafting
  or brainstorming would be safe
- the skill allows assumption-based code generation without declaring a mode,
  boundary, or user-visible uncertainty
- a non-strict mode can silently affect committed code, tests, configuration,
  dependencies, security behavior, or verification claims
- the user has no way to request stricter checking or lighter exploratory work

## Evidence Boundary Checks

Check whether the target clearly defines what evidence may be used.

Acceptable evidence may include:

- user-provided requirements and constraints
- inspected local source files, tests, configuration, documentation, and build
  metadata
- command output from build, test, lint, type-check, diagnostic, or help
  commands that were actually run
- official documentation or primary-source references for external APIs,
  libraries, services, current behavior, or version-specific details
- established repository conventions or sibling project patterns that were
  actually inspected

Flag issues when:

- the prompt tells agents to implement code without saying what facts must be
  checked first
- the skill allows agents to rely on general knowledge for project-specific
  APIs, file paths, commands, configuration, dependency behavior, or expected
  output
- external API, service, package, or framework behavior is assumed without a
  local source, official source, or explicit user-provided requirement
- the skill does not distinguish confirmed facts from assumptions, unresolved
  items, or guesses

## Missing Evidence Acquisition Checks

Check whether the target tells agents what to do when required information is
missing.

Flag an issue when the target only says "do not hallucinate" or "avoid
unsupported facts" but does not define how to obtain missing information.

For strict implementation workflows, missing information should trigger one or
more of these actions before code is generated:

- inspect relevant local files
- search the repository for existing patterns, symbols, tests, and
  configuration
- read existing tests, build files, package metadata, CLI help, and docs
- run available build, test, lint, type-check, or diagnostic commands when
  appropriate and permitted
- consult official documentation or primary-source references when external
  APIs, current behavior, or version-specific behavior matter
- ask the user for missing requirements, environment facts, acceptance
  criteria, or design decisions
- state assumptions explicitly and mark unresolved facts as unverified
- avoid generating code that depends on unresolved facts

## User Prompting Checks

In strict mode, when missing information cannot be found locally or from
reliable external sources, the target should instruct the agent to ask the user
instead of inventing the answer.

Check whether user prompting is concrete enough to be useful:

- the prompt names the missing fact or decision
- the prompt explains why the information is needed before implementation
- the prompt is answerable without requiring the user to infer the hidden
  context
- the prompt offers concise options when the decision space is clear
- the prompt does not ask the user to confirm a guessed fact as if it were
  already known

Flag issues when:

- a code-generation skill has no "ask the user" fallback for missing
  implementation facts
- the skill says to ask questions only vaguely, without requiring concrete,
  answerable prompts
- the skill encourages agents to proceed with assumptions when asking the user
  would be the safer path
- the generated code could depend on unknown API behavior, file layout,
  environment, version, command syntax, or acceptance criteria without a user
  prompt or other evidence acquisition step

## Code Generation Guard Checks

For source-code generation Agent Skills, check that the skill blocks these
unsupported outputs unless evidence has been obtained:

- invented APIs, methods, classes, imports, package names, or command-line
  options
- guessed file paths, module boundaries, configuration keys, environment
  variables, or generated artifact paths
- unverified dependency versions, compatibility claims, platform support, or
  runtime behavior
- assumed security, privacy, authentication, authorization, or data-retention
  requirements
- tests that assert behavior not stated by requirements, existing code, or
  inspected docs
- final reports claiming verification that was not actually run

Good code-generation skills should explicitly require the agent to pause,
investigate, or ask the user before writing code that depends on these facts.
If the skill supports exploratory or assumption-tolerant code sketches, it
should keep them separate from implementation-ready code and label unverified
details clearly.

## Severity Guidance

Use these severity levels:

- High: a code-generation skill can proceed with implementation when required
  API, repository, environment, security, or acceptance-criteria facts are
  missing and no evidence acquisition or user prompt is required.
- Medium: the skill says not to hallucinate, but does not define concrete
  acquisition steps or user prompting behavior.
- Medium: the skill defines evidence sources but does not require unresolved
  facts to be marked as assumptions, unverified items, or blockers.
- Medium: the skill does not define whether evidence acquisition should be
  strict, balanced, or exploratory for its main workflows.
- Low: user prompts are allowed but not shaped clearly enough to be easy to
  answer.

## Review Output

Contribute findings to the [Consolidated Review Report](../../templates/consolidated-review-report.md). Do not emit a standalone `Evidence Acquisition Review` section
unless the user explicitly asks for per-lens reports. Use the canonical fields for
every finding.

When material, add only these lens-specific assessment notes:

```text
Scope: code generation / prompt / Agent Skill / docs / mixed
Evidence boundary: clear / partial / missing
Strictness mode: strict / balanced / exploratory / unclear
Missing-info behavior: investigate / ask user / assume / unclear
```

Lens-specific notes and ratings never replace finding severity, status, or
location and evidence. When this lens finds no material issue, do not emit a
separate no-issue block; preserve checked scope, verification, and residual risk
in the consolidated assessment notes.

Do not claim that a fact was verified unless the evidence was actually
inspected. When the review cannot determine whether a fact is supported, report
the missing evidence rather than filling it in.
